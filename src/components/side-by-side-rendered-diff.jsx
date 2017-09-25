import React from 'react';

/**
 * @typedef {Object} SideBySideRenderedDiffProps
 * @property {Version} a The "from" version
 * @property {Version} b The "to" version
 */

/**
 * Display two versions of a page, side-by-side.
 *
 * @class SideBySideRenderedDiff
 * @extends {React.Component}
 * @params {SideBySideRenderedDiffProps} props
 */
export default class SideBySideRenderedDiff extends React.Component {
  constructor (props) {
    super(props);
    this.frameA = null;
    this.frameB = null;
  }

  render () {
    if (!this.props) {
      return null;
    }

    return (
      <div className="side-by-side-render">
        <iframe sandbox="allow-forms allow-scripts" ref={frame => this.frameA = frame} />
        <iframe sandbox="allow-forms allow-scripts" ref={frame => this.frameB = frame} />
      </div>
    );
  }

  /**
     * @param {SideBySideRenderedDiffProps} nextProps
     * @param {Object} nextState
     * @returns {boolean}
     */
  shouldComponentUpdate (nextProps, nextState) {
    return nextProps.diff.from_version_id !== this.props.diff.from_version_id
      || nextProps.diff.to_version_id !== this.props.diff.to_version_id;
  }

  componentDidMount () {
    this._updateContent();
  }

  componentDidUpdate () {
    this._updateContent();
  }

  _updateContent () {
    const raw_source = this.props.diff.content.diff;

    this.frameA.setAttribute(
      'srcdoc',
      createChangedSource(raw_source, this.props.page, 'removals'));
    this.frameB.setAttribute(
      'srcdoc',
      createChangedSource(raw_source, this.props.page, 'additions'));
  }
}

/**
 * Create renderable HTML source code rendering either the added or removed
 * parts of the page from a an HTML diff representing the full change between
 * two versions.
 *
 * @param {string} source Full diff source code
 * @param {Page} page The page that is being diffed
 * @param {string} viewType Either `additions` or `removals`
 */
function createChangedSource (source, page, viewType) {
  const elementToRemove = viewType === 'additions' ? 'del' : 'ins';

  // Remove <ins/del> in <head> before parsing; parsing will throw them out
  // but keep their contents. That could leave us with <link> or <script>
  // elements that should have been removed.
  let newSource = source.replace(/<head[^]*<\/head>/i, head => {
    return head.replace(
      new RegExp(`<${elementToRemove}[^>]*>[^]*?</${elementToRemove}>`, 'ig'),
      '');
  });

  const parser = new DOMParser();
  const newDocument = parser.parseFromString(newSource, 'text/html');
  removeChangeElements(elementToRemove, newDocument);
  renderableDocument(newDocument, page);

  const prefix = source.match(/^[^]*?<html/ig)[0];
  newSource = prefix + newDocument.documentElement.outerHTML.slice(5);

  return newSource;
}

/**
 * Process HTML document so that it renders nicely. This includes things like
 * adding a `<base>` tag so subresources are properly fetched.
 *
 * @param {HTMLDocument} sourceDocument
 * @param {Page} page
 * @returns {HTMLDocument}
 */
function renderableDocument (sourceDocument, page) {
  const base = sourceDocument.createElement('base');
  base.href = page.url;
  // <meta charset> tags don't work unless they are first, so if one is
  // present, modify <head> content *after* it.
  const charsetElement = sourceDocument.querySelector('meta[charset]');
  if (charsetElement) {
    charsetElement.insertAdjacentElement('afterend', base);
  }
  else {
    sourceDocument.head.insertAdjacentElement('afterbegin', base);
  }

  return sourceDocument;
}

/**
 * Remove HTML elements representing additions or removals from a document.
 * If removing an element leaves its parent element empty, the parent element
 * is also removed, and so on recursively up the tree. This is meant to
 * compensate for the fact that our diff is really a text diff that is
 * sensitive to the tree and not an actual tree diff.
 *
 * NOTE: this method is meant to be converted to source code and run *in the
 * context of the web page itself.*
 *
 * @param {string} type  Element type to remove, i.e. `ins` or `del`.
 * @param {HTMLDocument} [sourceDocument]  Document to remove elements from.
 *   If not sepecified, the current window's document will be used.
 */
function removeChangeElements (type, sourceDocument) {
  sourceDocument = sourceDocument || window.document;

  function removeEmptyParents (elements) {
    if (elements.size === 0) return;

    const parents = new Set();
    elements.forEach(element => {
      if (element.parentNode
          && element.childElementCount === 0
          && /^[\s\n\r]*$/.test(element.textContent)) {
        parents.add(element.parentNode);
        element.parentNode.removeChild(element);
      }
    });

    return removeEmptyParents(parents);
  }

  const parents = new Set();
  sourceDocument.querySelectorAll(type).forEach(element => {
    parents.add(element.parentNode);
    element.parentNode.removeChild(element);
  });
  removeEmptyParents(parents);
}

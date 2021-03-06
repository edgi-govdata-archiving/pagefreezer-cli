/*eslint-env commonjs*/

// Intl.DateTimeFormat is available in most engines, but not *everywhere.*
if (global.Intl && global.Intl.DateTimeFormat) {
  exports.dateFormatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    month: 'long',
    second: 'numeric',
    year: 'numeric',
    timeZoneName: 'short'
  });
}
else {
  // This follows the same basic API as Intl.DateTimeFormat, but returns a very
  // simple old-school localized date. It won't have perfect formatting, but it
  // works and is minimally complex.
  exports.dateFormatter = {
    format (date) {
      return date.toLocaleString();
    }
  };
}

exports.formatMaintainers = maintainers => maintainers.map(maintainership => maintainership.name).join(', ');

exports.formatSites = tags => {
  const sitePrefix = 'site:';
  return tags
    .filter(tagging => tagging.name.startsWith(sitePrefix))
    .map(tagging => tagging.name.slice(sitePrefix.length))
    .join(', ');
};

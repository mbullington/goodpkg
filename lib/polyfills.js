String.prototype.replaceAll =
  String.prototype.replaceAll ||
  function (search, replacement) {
    return this.split(search).join(replacement);
  };

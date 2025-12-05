(function() {
  module.exports.choose_two = function(items) {
    let item_tuples = [];

    for (let i = 0; i < items.length - 1; i++) {
      for (let j = i; j < items.length - 1; j++) {
        item_tuples.push([items[i], items[j+1]]);
      }
    }

    return item_tuples;
  }
  
  module.exports.choose_two_int = function(length) {
    return ((length) * (length-1))/2;
  }
}());

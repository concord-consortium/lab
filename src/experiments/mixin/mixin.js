var resultsList;

function newLog(result) {
  var ul;
  if (typeof(results) === "undefined") {
    console.log(result);
  } else {
    ul = document.createElement("ul")
    ul.innerHTML = result;
    resultsList = results.appendChild(ul);
  }
}

function log(result) {
  var li;
  if (typeof(resultsList) === "undefined") {
    console.log(result);
  } else {
    li = document.createElement("li")
    li.innerHTML = result;
    resultsList.appendChild(li);
  }
}

// ************************************************

newLog("1. Standard getter method accessing variables in closure (no use of mixin).");

function Model1(options) {
  var myOptions = options;
  this.get = function(prop) {
    return myOptions[prop];
  };
}

m1 = new Model1({ a:1, b:3, c:3 });
log("a == 1: " + (m1.get("a") === 1));

var Model1a = function (options) {
  var myOptions = options;
  this.get = function(prop) {
    return myOptions[prop];
  };
};

m1a = new Model1a({ a:1, b:3, c:3 });
log("a == 1: " + (m1a.get("a") === 1));

// ************************************************

newLog("2. Standard getter mixin accessing variables saved as properties in Model object.");

var addMixin2 = (function() {
  function get(prop) {
    return this.options[prop];
  }
  return function() {
    this.get = get;
    return this;
  };
})();

function Model2(options) {
  addMixin2.call(Model2.prototype);
  this.options = options;
}

m2 = new Model2({ a:1, b:3, c:3 });
log("a == 1: " + (m2.get("a") === 1));

var Model2a = function(options) {
  addMixin2.call(Model2a.prototype);
  this.options = options;
};

m2a = new Model2a({ a:1, b:3, c:3 });
log("a == 1: " + (m2a.get("a") === 1));

// ************************************************

newLog("3. Getter mixin accessing closure variables with the help of function in Model object.");

var addMixin3 = (function() {
  function get(prop) {
    return this.getPrivate()[prop];
  }
  return function() {
    this.get = get;
    return this;
  };
})();

function Model3(options) {
  addMixin3.call(Model3.prototype);
  var myOptions = options;
  this.getPrivate = function() {
    return myOptions;
  };
}

m3 = new Model3({ a:1, b:3, c:3 });
log("a == 1: " + (m3.get("a") === 1));

var Model3a = function(options) {
  addMixin3.call(Model3a.prototype);
  var myOptions = options;
  this.getPrivate = function() {
    return myOptions;
  };
};

m3a = new Model3a({ a:1, b:3, c:3 });
log("a == 1: " + (m3a.get("a") === 1));

// ************************************************

newLog("4. Mixin accessing it's own closure variables and variables saved as properties in Model object.");

// 'count' is scoped to the function mixed in to the model object
// 'total' is scoped to the mixin itself

var addMixin4 = (function() {
  var total = 0;
  function counter(num) {
    var count = num;
    return function() {
      total++;
      if (count < this.opts.maxCount) count++
      return count;
    };
  }
  function totalCount() {
    return function() {
      return total;
    };
  }
  return function(num) {
    this.counter = counter(num);
    this.totalCount = totalCount();
    return this;
  };
})();

function Model4(num, opts) {
  this.opts = opts;
  addMixin4.call(Model4.prototype, num);
}

var Model4a = function(num, opts) {
  this.opts = opts;
  addMixin4.call(Model4a.prototype, num);
};

m4 = new Model4(23, { maxCount: 25 });
m4a = new Model4a(17, { maxCount: 22 });

log("m4 counter starting at 23 ... with a maxCount of " + m4.opts.maxCount);
log(m4.counter());
log(m4.counter());
log(m4.counter());
log(m4.counter());
log(m4.counter());
log(m4.counter());
log("total calls to counter() by all uses of mixin: " + m4.totalCount());

log("&nbsp;");
log("m4a counter starting at 17 ... with a maxCount of " + m4a.opts.maxCount);
log(m4a.counter());
log(m4a.counter());
log(m4a.counter());
log(m4a.counter());
log(m4a.counter());
log(m4a.counter());
log("total calls to counter() by all uses of mixin: " + m4.totalCount());





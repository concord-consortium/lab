(function() {
  var ButtonBarComponent, ButtonComponent, Component, JSliderComponent, ModelPlayer, PlayOnlyComponentSVG, PlaybackBarComponent, PlaybackComponent, PlaybackComponentSVG, SliderComponent, Thermometer, ToggleButtonComponent, root,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  Component = (function() {

    function Component(dom_id) {
      this.dom_id = dom_id;
      if (this.dom_id) {
        this.dom_element = $(this.dom_id);
      } else {
        this.dom_element = $('<div>');
      }
      this.dom_element.addClass('component');
    }

    return Component;

  })();

  ButtonComponent = (function(_super) {

    __extends(ButtonComponent, _super);

    function ButtonComponent(dom_id, name, actions) {
      this.dom_id = dom_id;
      this.name = name != null ? name : 'play';
      this.actions = actions != null ? actions : [];
      ButtonComponent.__super__.constructor.call(this, this.dom_id);
      this.dom_element.addClass('button').addClass(this.name).addClass('up');
      this.state = 'up';
      this.init_mouse_handlers();
    }

    ButtonComponent.prototype.set_state = function(newstate) {
      this.dom_element.removeClass(this.state);
      this.state = newstate;
      return this.dom_element.addClass(this.state);
    };

    ButtonComponent.prototype.init_mouse_handlers = function() {
      var self,
        _this = this;
      self = this;
      this.dom_element.mousedown(function(e) {
        self.set_state("down");
        return self.start_down_ticker();
      });
      this.dom_element.mouseup(function() {
        clearInterval(_this.ticker);
        self.set_state("up");
        return self.do_action();
      });
      return this.dom_element.mouseleave(function() {
        clearInterval(_this.ticker);
        return self.set_state("up");
      });
    };

    ButtonComponent.prototype.add_action = function(action) {
      return this.actions.push(action);
    };

    ButtonComponent.prototype.do_action = function() {
      var action, _i, _len, _ref, _results;
      _ref = this.actions;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        action = _ref[_i];
        _results.push(action());
      }
      return _results;
    };

    ButtonComponent.prototype.start_down_ticker = function() {
      var self;
      self = this;
      this.ticker_count = 0;
      return this.ticker = setInterval(function() {
        self.do_action();
        self.ticker_count += 1;
        if (self.ticker_count > 4) self.do_action();
        if (self.ticker_count > 8) {
          self.do_action();
          return self.do_action();
        }
      }, 250);
    };

    return ButtonComponent;

  })(Component);

  root.ButtonComponent = ButtonComponent;

  ToggleButtonComponent = (function(_super) {

    __extends(ToggleButtonComponent, _super);

    function ToggleButtonComponent(dom_id, _buttons) {
      var button, _i, _len;
      this.dom_id = dom_id;
      if (_buttons == null) _buttons = [];
      ToggleButtonComponent.__super__.constructor.call(this, this.dom_id, 'toggle');
      this.buttons = [];
      for (_i = 0, _len = _buttons.length; _i < _len; _i++) {
        button = _buttons[_i];
        this.add_button(button);
      }
      this.button_index = 0;
      this.enable_button(0);
    }

    ToggleButtonComponent.prototype.add_button = function(button) {
      var index, self;
      button.dom_element.remove();
      button.dom_element.css('margin', '0px');
      this.dom_element.append(button.dom_element);
      this.buttons.push(button);
      this.add_width(button.dom_element);
      this.add_height(button.dom_element);
      self = this;
      index = this.buttons.length - 1;
      if (index !== this.button_index) return this.disable_button(index);
    };

    ToggleButtonComponent.prototype.add_width = function(element) {
      var elem_width, width;
      width = this.dom_element.width();
      elem_width = element.outerWidth(true);
      if (width < elem_width) {
        return this.dom_element.width("" + elem_width + "px");
      }
    };

    ToggleButtonComponent.prototype.add_height = function(element) {
      var elem_height, height;
      height = this.dom_element.height();
      elem_height = element.outerHeight(true);
      if (height < elem_height) {
        return this.dom_element.height("" + elem_height + "px");
      }
    };

    ToggleButtonComponent.prototype.disable_button = function(index) {
      var button;
      button = this.buttons[index];
      if (button) return button.dom_element.addClass('hidden');
    };

    ToggleButtonComponent.prototype.enable_button = function(index) {
      var button;
      button = this.buttons[index];
      if (button) return button.dom_element.removeClass('hidden');
    };

    ToggleButtonComponent.prototype.set_active = function(index) {
      this.disable_button(this.button_index);
      this.button_index = index;
      this.button_index = this.button_index % this.buttons.length;
      return this.enable_button(this.button_index);
    };

    ToggleButtonComponent.prototype.enable_next_button = function() {
      return this.set_active(this.button_index + 1);
    };

    ToggleButtonComponent.prototype.current_button = function() {
      if (this.button_index < this.buttons.length) {
        return this.buttons[this.button_index];
      }
      return null;
    };

    ToggleButtonComponent.prototype.do_action = function() {
      if (this.current_button()) {
        this.current_button().do_action();
        return this.enable_next_button();
      }
    };

    return ToggleButtonComponent;

  })(ButtonComponent);

  root.ToggleButtonComponent = ToggleButtonComponent;

  ButtonBarComponent = (function(_super) {

    __extends(ButtonBarComponent, _super);

    function ButtonBarComponent(dom_id, _buttons) {
      var button, _i, _len;
      this.dom_id = dom_id;
      if (_buttons == null) _buttons = [];
      ButtonBarComponent.__super__.constructor.call(this, this.dom_id);
      this.dom_element.addClass('button_bar');
      this.buttons = [];
      this.dom_element.width('1px');
      this.dom_element.height('1px');
      for (_i = 0, _len = _buttons.length; _i < _len; _i++) {
        button = _buttons[_i];
        this.add_button(button);
      }
    }

    ButtonBarComponent.prototype.add_button = function(button) {
      var elem;
      elem = button.dom_element;
      this.dom_element.append(elem);
      this.add_width(elem);
      this.add_height(elem);
      return this.buttons.push(button);
    };

    ButtonBarComponent.prototype.add_width = function(element) {
      var width;
      width = this.dom_element.width();
      width = width + element.outerWidth(true);
      return this.dom_element.width("" + width + "px");
    };

    ButtonBarComponent.prototype.add_height = function(element) {
      var elem_height, height;
      height = this.dom_element.height();
      elem_height = element.outerHeight(true);
      if (height < elem_height) {
        return this.dom_element.height("" + elem_height + "px");
      }
    };

    return ButtonBarComponent;

  })(Component);

  root.ButtonBarComponent = ButtonBarComponent;

  PlaybackBarComponent = (function(_super) {

    __extends(PlaybackBarComponent, _super);

    function PlaybackBarComponent(dom_id, playable, simplified) {
      var back, forward, pause, play, reset,
        _this = this;
      this.dom_id = dom_id;
      this.playable = playable;
      if (simplified == null) simplified = true;
      PlaybackBarComponent.__super__.constructor.call(this, this.dom_id);
      play = new ButtonComponent(null, 'play');
      play.add_action(function() {
        return _this.playable.play();
      });
      pause = new ButtonComponent(null, 'pause');
      pause.add_action(function() {
        return _this.playable.stop();
      });
      this.toggle = new ToggleButtonComponent(null, [play, pause]);
      this.play_index = 0;
      this.stop_index = 1;
      reset = new ButtonComponent(null, 'reset');
      reset.add_action(function() {
        _this.playable.seek(1);
        return _this.play();
      });
      this.add_button(reset);
      if (!simplified) {
        forward = new ButtonComponent(null, 'forward');
        forward.add_action(function() {
          _this.playable.forward();
          return _this.stop();
        });
        this.add_button(forward);
      }
      this.add_button(this.toggle);
      if (!simplified) {
        back = new ButtonComponent(null, 'back');
        back.add_action(function() {
          _this.playable.back();
          return _this.stop();
        });
        this.add_button(back);
      }
      this.play();
    }

    PlaybackBarComponent.prototype.stop = function() {
      return this.toggle.set_active(this.play_index);
    };

    PlaybackBarComponent.prototype.play = function() {
      return this.toggle.set_active(this.stop_index);
    };

    return PlaybackBarComponent;

  })(ButtonBarComponent);

  root.PlaybackBarComponent = PlaybackBarComponent;

  JSliderComponent = (function() {

    function JSliderComponent(dom_id, value_changed_function) {
      var _this = this;
      this.dom_id = dom_id != null ? dom_id : "#slider";
      this.value_changed_function = value_changed_function;
      this.dom_element = $(this.dom_id);
      this.precision = this.dom_element.attr('data-precision') || 3;
      this.min = this.dom_element.attr('data-min') || 0;
      this.max = this.dom_element.attr('data-max') || 1;
      this.step = this.dom_element.attr('data-stop') || 0.01;
      this.value = this.dom_element.attr('data-value') || 0.5;
      this.label = this.dom_element.attr('data-label');
      this.label_id = this.dom_element.attr('data-label-id');
      this.orientation = this.dom_element.attr('data-orientation') || "horizontal";
      this.dom_element.slider();
      this.update_options();
      this.dom_element.bind("slide", function(event, ui) {
        console.log("slider value: " + ui.value);
        _this.update_label(ui.value);
        if (_this.value_changed_function) {
          return _this.value_changed_function(ui.value);
        }
      });
      this.update_label(this.value);
    }

    JSliderComponent.prototype.set_max = function(max) {
      this.max = max;
      return this.update_options();
    };

    JSliderComponent.prototype.set_min = function(min) {
      this.min = min;
      return this.update_options();
    };

    JSliderComponent.prototype.update_options = function() {
      var opts;
      opts = {
        orientation: this.orientation,
        min: this.min,
        max: this.max,
        value: this.value,
        step: this.step,
        range: "min"
      };
      return this.dom_element.slider('option', opts);
    };

    JSliderComponent.prototype.update_label = function(value) {
      if (this.label_id) {
        return $(this.label_id).text("" + this.label + " " + value);
      }
    };

    return JSliderComponent;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.JSliderComponent = JSliderComponent;

  PlayOnlyComponentSVG = (function() {

    function PlayOnlyComponentSVG(svg_element, playable, xpos, ypos, scale) {
      this.svg_element = svg_element;
      this.playable = playable != null ? playable : null;
      this.offsets = {
        'play': 1,
        'stop': 1
      };
      this.width = 200;
      this.height = 34;
      this.xpos = xpos;
      this.ypos = ypos;
      this.scale = scale || 1;
      this.unit_width = this.width / 9;
      this.vertical_padding = (this.height - this.unit_width) / 2;
      this.stroke_width = this.unit_width / 10;
      this.init_view();
    }

    PlayOnlyComponentSVG.prototype.offset = function(key) {
      return this.offsets[key] * (this.unit_width * 2) + this.unit_width;
    };

    PlayOnlyComponentSVG.prototype.make_button = function(button_name, type, point_set) {
      var art, art2, button_bg, button_group, button_highlight, point, points, points_string, x, y, _i, _j, _len, _len2,
        _this = this;
      button_group = this.group.append('svg:g');
      x = this.offset(button_name);
      button_group.attr("class", "component playbacksvgbutton").attr('x', x).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width * 2).attr('style', 'fill: #cccccc');
      button_bg = button_group.append('rect');
      button_bg.attr('class', 'bg').attr('x', this.offset(button_name) / 1.20).attr('y', this.vertical_padding / 3).attr('width', this.unit_width * 2).attr('height', this.unit_width * 1.5).attr('rx', '0');
      for (_i = 0, _len = point_set.length; _i < _len; _i++) {
        points = point_set[_i];
        art = button_group.append(type);
        art.attr('class', "" + button_name + " button-art");
        points_string = "";
        for (_j = 0, _len2 = points.length; _j < _len2; _j++) {
          point = points[_j];
          x = this.offset(button_name) + point['x'] * this.unit_width;
          y = this.vertical_padding / .75 + point['y'] * this.unit_width;
          points_string = points_string + (" " + x + "," + y);
          art.attr('points', points_string);
        }
        if (button_name === 'stop') {
          art2 = button_group.append('rect');
          art2.attr('class', 'pause-center').attr('x', x + this.unit_width / 3).attr('y', this.vertical_padding / .75 - 1).attr('width', this.unit_width / 3).attr('height', this.unit_width + 2);
        }
      }
      button_highlight = button_group.append('rect');
      button_highlight.attr('class', 'highlight').attr('x', this.offset(button_name) / 1.20 + 1).attr('y', this.vertical_padding / 1.85).attr('width', this.unit_width * 2 - 2).attr('height', this.unit_width / 1.4).attr('rx', '0');
      button_group.on('click', function() {
        return _this.action(button_name);
      });
      return button_group;
    };

    PlayOnlyComponentSVG.prototype.action = function(action) {
      console.log("running " + action + " ");
      if (this.playable) {
        switch (action) {
          case 'play':
            this.playable.play();
            break;
          case 'stop':
            this.playable.stop();
            break;
          case 'forward':
            this.playable.forward();
            break;
          case 'back':
            this.playable.back();
            break;
          case 'reset':
            this.playable.seek(1);
            break;
          default:
            console.log("cant find action for " + action);
        }
      } else {
        console.log("no @playable defined");
      }
      return this.update_ui();
    };

    PlayOnlyComponentSVG.prototype.init_play_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.play = this.make_button('play', 'svg:polygon', points);
    };

    PlayOnlyComponentSVG.prototype.init_stop_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0
          }, {
            x: 1,
            y: 1
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: 0
          }
        ]
      ];
      return this.stop = this.make_button('stop', 'svg:polygon', points);
    };

    PlayOnlyComponentSVG.prototype.init_pause_button = function() {
      var points;
      points = [
        [
          {
            x: .5,
            y: .5
          }, {
            x: .5,
            y: 0
          }, {
            x: .5,
            y: 1
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: 0
          }
        ]
      ];
      return this.pause = this.make_button('pause', 'svg:polygon', points);
    };

    PlayOnlyComponentSVG.prototype.init_view = function() {
      this.svg = this.svg_element.append("svg:svg").attr("class", "component playbacksvg").attr("x", this.xpos).attr("y", this.ypos);
      this.group = this.svg.append("g").attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
      this.init_play_button();
      this.init_stop_button();
      if (this.playable.playing) {
        return this.hide(this.play);
      } else {
        return this.hide(this.stop);
      }
    };

    PlayOnlyComponentSVG.prototype.position = function(xpos, ypos, scale) {
      this.xpos = xpos;
      this.ypos = ypos;
      this.scale = scale || 1;
      this.svg.attr("x", this.xpos).attr("y", this.ypos);
      return this.group.attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
    };

    PlayOnlyComponentSVG.prototype.update_ui = function() {
      if (this.playable) {
        if (this.playable.playing) {
          this.hide(this.play);
          return this.show(this.stop);
        } else {
          this.hide(this.stop);
          return this.show(this.play);
        }
      }
    };

    PlayOnlyComponentSVG.prototype.hide = function(thing) {
      return thing.style('visibility', 'hidden');
    };

    PlayOnlyComponentSVG.prototype.show = function(thing) {
      return thing.style('visibility', 'visible');
    };

    return PlayOnlyComponentSVG;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.PlayOnlyComponentSVG = PlayOnlyComponentSVG;

  root.ModelPlayer = ModelPlayer;

  ModelPlayer = (function() {

    function ModelPlayer(model, playing) {
      this.model = model;
      if (arguments.length > 1) {
        this.playing = playing;
      } else {
        this.playing = true;
      }
    }

    ModelPlayer.prototype.play = function() {
      this.model.resume();
      return this.playing = true;
    };

    ModelPlayer.prototype.stop = function() {
      this.model.stop();
      return this.playing = false;
    };

    ModelPlayer.prototype.forward = function() {
      this.stop();
      return this.model.stepForward();
    };

    ModelPlayer.prototype.back = function() {
      this.stop();
      return this.model.stepBack();
    };

    ModelPlayer.prototype.seek = function(float_index) {
      this.stop();
      this.model.seek(float_index);
      return this.play();
    };

    return ModelPlayer;

  })();

  PlaybackComponent = (function() {

    function PlaybackComponent(dom_id, playable) {
      this.dom_id = dom_id != null ? dom_id : "#playback";
      this.playable = playable != null ? playable : null;
      this.dom_element = d3.select(this.dom_id).attr('class', 'component playback');
      this.offsets = {
        'reset': 0,
        'back': 1,
        'play': 2,
        'stop': 2,
        'forward': 3
      };
      this.width = parseInt(this.dom_element.style("width"));
      this.height = parseInt(this.dom_element.style("height"));
      this.unit_width = this.width / 9;
      if (this.height < this.unit_width) {
        this.height = this.unit_width + 2;
        this.dom_element.style("height", this.height + "px");
      }
      this.vertical_padding = (this.height - this.unit_width) / 2;
      this.stroke_width = this.unit_width / 10;
      this.init_view();
    }

    PlaybackComponent.prototype.offset = function(key) {
      return this.offsets[key] * (this.unit_width * 2) + this.unit_width;
    };

    PlaybackComponent.prototype.make_button = function(button_name, type, point_set) {
      var art, button_group, point, points, points_string, x, y, _i, _j, _len, _len2,
        _this = this;
      button_group = this.svg.append('svg:g');
      x = this.offset(button_name);
      button_group.attr('x', x).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width);
      for (_i = 0, _len = point_set.length; _i < _len; _i++) {
        points = point_set[_i];
        art = button_group.append(type);
        art.attr('class', "" + button_name + " button-art");
        points_string = "";
        for (_j = 0, _len2 = points.length; _j < _len2; _j++) {
          point = points[_j];
          x = this.offset(button_name) + point['x'] * this.unit_width;
          y = this.vertical_padding + point['y'] * this.unit_width;
          points_string = points_string + (" " + x + "," + y);
          art.attr('points', points_string);
        }
      }
      button_group.on('click', function() {
        return _this.action(button_name);
      });
      return button_group;
    };

    PlaybackComponent.prototype.action = function(action) {
      console.log("running " + action + " ");
      if (this.playable) {
        switch (action) {
          case 'play':
            this.playable.play();
            break;
          case 'stop':
            this.playable.stop();
            break;
          case 'forward':
            this.playable.forward();
            break;
          case 'back':
            this.playable.back();
            break;
          case 'reset':
            this.playable.seek(1);
            break;
          default:
            console.log("cant find action for " + action);
        }
      } else {
        console.log("no @playable defined");
      }
      return this.update_ui();
    };

    PlaybackComponent.prototype.init_reset_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 0,
            y: 1
          }, {
            x: 1,
            y: 1
          }, {
            x: 1,
            y: 0
          }, {
            x: 0.25,
            y: 0
          }, {
            x: 0.5,
            y: 0.25
          }
        ]
      ];
      return this.reset = this.make_button('reset', 'svg:polyline', points);
    };

    PlaybackComponent.prototype.init_play_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.play = this.make_button('play', 'svg:polygon', points);
    };

    PlaybackComponent.prototype.init_stop_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0
          }, {
            x: 1,
            y: 1
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: 0
          }
        ]
      ];
      return this.stop = this.make_button('stop', 'svg:polygon', points);
    };

    PlaybackComponent.prototype.init_back_button = function() {
      var points;
      points = [
        [
          {
            x: 0.5,
            y: 0
          }, {
            x: 0,
            y: 0.5
          }, {
            x: 0.5,
            y: 1
          }
        ], [
          {
            x: 1,
            y: 0
          }, {
            x: 0.5,
            y: 0.5
          }, {
            x: 1,
            y: 1
          }
        ]
      ];
      return this.back = this.make_button('back', 'svg:polyline', points);
    };

    PlaybackComponent.prototype.init_forward_button = function() {
      var points;
      points = [
        [
          {
            x: 0.5,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0.5,
            y: 1
          }
        ], [
          {
            x: 0,
            y: 0
          }, {
            x: 0.5,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.forward = this.make_button('forward', 'svg:polyline', points);
    };

    PlaybackComponent.prototype.init_view = function() {
      this.svg = this.dom_element.append("svg:svg").attr("width", this.width).attr("height", this.height);
      this.init_reset_button();
      this.init_play_button();
      this.init_stop_button();
      this.init_forward_button();
      this.init_back_button();
      return this.hide(this.play);
    };

    PlaybackComponent.prototype.update_ui = function() {
      if (this.playable) {
        if (this.playable.playing) {
          this.hide(this.play);
          return this.show(this.stop);
        } else {
          this.hide(this.stop);
          return this.show(this.play);
        }
      }
    };

    PlaybackComponent.prototype.hide = function(thing) {
      return thing.style('visibility', 'hidden');
    };

    PlaybackComponent.prototype.show = function(thing) {
      return thing.style('visibility', 'visible');
    };

    return PlaybackComponent;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.PlaybackComponent = PlaybackComponent;

  root.ModelPlayer = ModelPlayer;

  PlaybackComponentSVG = (function() {

    function PlaybackComponentSVG(svg_element, playable, xpos, ypos, scale) {
      this.svg_element = svg_element;
      this.playable = playable != null ? playable : null;
      this.offsets = {
        'reset': 0,
        'back': 1,
        'play': 2,
        'stop': 2,
        'forward': 3
      };
      this.width = 200;
      this.height = 34;
      this.xpos = xpos;
      this.ypos = ypos;
      this.scale = scale || 1;
      this.unit_width = this.width / 9;
      this.vertical_padding = (this.height - this.unit_width) / 2;
      this.stroke_width = this.unit_width / 10;
      this.init_view();
    }

    PlaybackComponentSVG.prototype.offset = function(key) {
      return this.offsets[key] * (this.unit_width * 2) + this.unit_width;
    };

    PlaybackComponentSVG.prototype.make_button = function(button_name, type, point_set) {
      var art, art2, button_bg, button_group, button_highlight, point, points, points_string, x, xoffset, y, _i, _j, _len, _len2,
        _this = this;
      button_group = this.group.append('svg:g');
      xoffset = this.offset(button_name);
      button_group.attr("class", "component playbacksvgbutton").attr('x', x).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width * 2).attr('style', 'fill: #cccccc');
      button_bg = button_group.append('rect');
      button_bg.attr('class', 'bg').attr('x', xoffset).attr('y', this.vertical_padding / 3).attr('width', this.unit_width * 2).attr('height', this.unit_width * 1.5).attr('rx', '0');
      for (_i = 0, _len = point_set.length; _i < _len; _i++) {
        points = point_set[_i];
        art = button_group.append(type);
        art.attr('class', "" + button_name + " button-art");
        points_string = "";
        for (_j = 0, _len2 = points.length; _j < _len2; _j++) {
          point = points[_j];
          x = xoffset + 8 + point['x'] * this.unit_width;
          y = this.vertical_padding / .75 + point['y'] * this.unit_width;
          points_string = points_string + (" " + x + "," + y);
          art.attr('points', points_string);
        }
        if (button_name === 'stop') {
          art2 = button_group.append('rect');
          art2.attr('class', 'pause-center').attr('x', x + this.unit_width / 3).attr('y', this.vertical_padding / .75 - 1).attr('width', this.unit_width / 3).attr('height', this.unit_width + 2);
        }
      }
      button_highlight = button_group.append('rect');
      button_highlight.attr('class', 'highlight').attr('x', xoffset + 1).attr('y', this.vertical_padding / 1.85).attr('width', this.unit_width * 2 - 2).attr('height', this.unit_width / 1.4).attr('rx', '0');
      button_group.on('click', function() {
        return _this.action(button_name);
      });
      return button_group;
    };

    PlaybackComponentSVG.prototype.action = function(action) {
      console.log("running " + action + " ");
      if (this.playable) {
        switch (action) {
          case 'play':
            this.playable.play();
            break;
          case 'stop':
            this.playable.stop();
            break;
          case 'forward':
            this.playable.forward();
            break;
          case 'back':
            this.playable.back();
            break;
          case 'reset':
            this.playable.seek(1);
            break;
          default:
            console.log("cant find action for " + action);
        }
      } else {
        console.log("no @playable defined");
      }
      return this.update_ui();
    };

    PlaybackComponentSVG.prototype.init_reset_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 0,
            y: 1
          }, {
            x: 1,
            y: 1
          }, {
            x: 1,
            y: 0
          }, {
            x: 0.25,
            y: 0
          }, {
            x: 0.5,
            y: 0.25
          }
        ]
      ];
      return this.reset = this.make_button('reset', 'svg:polyline', points);
    };

    PlaybackComponentSVG.prototype.init_play_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.play = this.make_button('play', 'svg:polygon', points);
    };

    PlaybackComponentSVG.prototype.init_stop_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0
          }, {
            x: 1,
            y: 1
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: 0
          }
        ]
      ];
      return this.stop = this.make_button('stop', 'svg:polygon', points);
    };

    PlaybackComponentSVG.prototype.init_pause_button = function() {
      var points;
      points = [
        [
          {
            x: .5,
            y: .5
          }, {
            x: .5,
            y: 0
          }, {
            x: .5,
            y: 1
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: 0
          }
        ]
      ];
      return this.pause = this.make_button('pause', 'svg:polygon', points);
    };

    PlaybackComponentSVG.prototype.init_back_button = function() {
      var points;
      points = [
        [
          {
            x: 0.5,
            y: 0
          }, {
            x: 0,
            y: 0.5
          }, {
            x: 0.5,
            y: 1
          }
        ], [
          {
            x: 1,
            y: 0
          }, {
            x: 0.5,
            y: 0.5
          }, {
            x: 1,
            y: 1
          }
        ]
      ];
      return this.back = this.make_button('back', 'svg:polyline', points);
    };

    PlaybackComponentSVG.prototype.init_forward_button = function() {
      var points;
      points = [
        [
          {
            x: 0.5,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0.5,
            y: 1
          }
        ], [
          {
            x: 0,
            y: 0
          }, {
            x: 0.5,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.forward = this.make_button('forward', 'svg:polyline', points);
    };

    PlaybackComponentSVG.prototype.init_view = function() {
      this.svg = this.svg_element.append("svg:svg").attr("class", "component playbacksvg").attr("x", this.xpos).attr("y", this.ypos);
      this.group = this.svg.append("g").attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
      this.init_reset_button();
      this.init_back_button();
      this.init_play_button();
      this.init_stop_button();
      this.init_forward_button();
      if (this.playable.playing) {
        return this.hide(this.play);
      } else {
        return this.hide(this.stop);
      }
    };

    PlaybackComponentSVG.prototype.position = function(xpos, ypos, scale) {
      this.xpos = xpos;
      this.ypos = ypos;
      this.scale = scale || 1;
      this.svg.attr("x", this.xpos).attr("y", this.ypos);
      return this.group.attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
    };

    PlaybackComponentSVG.prototype.update_ui = function() {
      if (this.playable) {
        if (this.playable.playing) {
          this.hide(this.play);
          return this.show(this.stop);
        } else {
          this.hide(this.stop);
          return this.show(this.play);
        }
      }
    };

    PlaybackComponentSVG.prototype.hide = function(thing) {
      return thing.style('visibility', 'hidden');
    };

    PlaybackComponentSVG.prototype.show = function(thing) {
      return thing.style('visibility', 'visible');
    };

    return PlaybackComponentSVG;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.PlaybackComponentSVG = PlaybackComponentSVG;

  root.ModelPlayer = ModelPlayer;

  SliderComponent = (function() {

    function SliderComponent(dom_id, value_changed_function, min, max, value) {
      this.dom_id = dom_id != null ? dom_id : "#slider";
      this.value_changed_function = value_changed_function;
      this.min = min;
      this.max = max;
      this.value = value;
      this.dom_element = $(this.dom_id);
      this.dom_element.addClass('component').addClass('slider');
      this.min = this.min || this.dom_element.attr('data-min') || 0;
      this.max = this.max || this.dom_element.attr('data-max') || 1;
      this.value = this.value || this.dom_element.attr('data-value') || 0.5;
      this.precision = this.dom_element.attr('data-precision') || 3;
      this.label = this.dom_element.attr('data-label');
      this.domain = this.max - this.min;
      this.mouse_down = false;
      this.width = this.dom_element.width();
      this.height = this.dom_element.height();
      this.init_view();
      this.init_mouse_handlers();
    }

    SliderComponent.prototype.horizontal_orientation = function() {
      if (this.width > this.height) return true;
    };

    SliderComponent.prototype.init_view = function() {
      var midpoint;
      this.slider_well = $('<div>').addClass('slider_well');
      this.dom_element.append(this.slider_well);
      midpoint = this.width / 2;
      this.y1 = this.height;
      this.y2 = 0;
      this.x1 = this.x2 = midpoint;
      this.handle_y = (this.y1 + this.y2) / 2;
      this.handle_x = (this.x1 + this.x2) / 2;
      if (this.horizontal_orientation()) {
        midpoint = this.height / 4;
        this.y1 = this.y2 = midpoint;
        this.x1 = 0;
        this.x2 = this.width;
        this.handle_y = (this.y1 + this.y2) / 2;
        this.handle_x = this.value / this.domain * this.width;
      }
      this.init_slider_fill();
      this.slider_well_height = this.slider_well.height();
      this.slider_well_width = this.slider_well.width();
      this.init_handle();
      return this.init_label();
    };

    SliderComponent.prototype.init_slider_fill = function() {
      this.slider_fill = $('<div>').addClass('slider_fill');
      this.slider_well.append(this.slider_fill);
      if (this.horizontal_orientation()) {
        this.slider_fill.addClass('horizontal');
      } else {
        this.slider_fill.addClass('vertical');
      }
      return this.update_slider_filled();
    };

    SliderComponent.prototype.update_slider_filled = function() {
      if (this.horizontal_orientation()) {
        return this.slider_fill.width("" + this.handle_x + "px");
      } else {
        return this.slider_fill.height("" + this.handle_y + "px");
      }
    };

    SliderComponent.prototype.init_handle = function() {
      this.handle = $('<div>').addClass('handle');
      this.slider_well.append(this.handle);
      this.handle_width = parseInt(this.handle.width());
      this.handle_height = parseInt(this.handle.height());
      this.handle_width_offset = (this.handle_width / 2) - (this.handle_width - this.slider_well_width) / 2;
      this.handle_height_offset = (this.handle_height / 2) - (this.handle_height - this.slider_well_height) / 4;
      return this.update_handle();
    };

    SliderComponent.prototype.update = function() {
      this.update_handle();
      this.update_slider_filled();
      return this.update_label();
    };

    SliderComponent.prototype.update_handle = function() {
      return this.handle.css('left', "" + (this.handle_x - (this.handle_width / 2)) + "px").css('top', "" + (this.handle_y - this.handle_height_offset) + "px");
    };

    SliderComponent.prototype.init_label = function() {
      this.text_label = $('<div/>').addClass('label');
      this.dom_element.append(this.text_label);
      return this.update_label();
    };

    SliderComponent.prototype.set_scaled_value = function(v) {
      this.value = (v - this.min) / this.domain;
      this.handle_x = v / this.domain * this.width;
      return this.update();
    };

    SliderComponent.prototype.scaled_value = function() {
      var results;
      results = this.value;
      results = results * (this.max - this.min);
      results = results + this.min;
      return results;
    };

    SliderComponent.prototype.update_label = function() {
      var fomatted_value;
      if (this.label) {
        fomatted_value = this.scaled_value().toFixed(this.precision);
        return this.text_label.text("" + this.label + ": " + fomatted_value);
      } else {
        return this.text_label.hide();
      }
    };

    SliderComponent.prototype.handle_mousedown = function(e) {
      var _this = this;
      this.dragging = true;
      $(document).bind("mouseup.drag", this.documentMouseUpDelegate = function(e) {
        return _this.handle_mouseup(e);
      });
      $(document).bind("mousemove.drag", this.documentMouseMoveDelegate = function(e) {
        return _this.handle_drag(e);
      });
      return this.handle_drag(e);
    };

    SliderComponent.prototype.handle_drag = function(e) {
      var max_x, min_x, x, y;
      if (this.dragging) {
        document.onselectstart = function() {
          return false;
        };
        x = e.pageX - this.slider_well.position().left;
        y = e.pageY - this.slider_well.position().top;
        if (this.horizontal_orientation()) {
          max_x = this.width - (this.handle_width / 4);
          min_x = this.handle_width / 4;
          this.handle_x = x;
          if (this.handle_x < min_x) this.handle_x = min_x;
          if (this.handle_x > max_x) this.handle_x = max_x;
          this.value = this.handle_x / this.width;
        } else {
          this.handle_y = e.y;
          this.handle.attr('cy', this.handle_y);
          this.slider_fill.attr("y", this.handle_y).attr("height", this.height - this.handle_y);
          this.value = this.handle_y / this.height;
        }
        if (typeof this.value_changed_function === 'function') {
          this.value_changed_function(this.scaled_value());
        }
        return this.update();
      } else {
        return false;
      }
    };

    SliderComponent.prototype.handle_mouseup = function() {
      document.onselectstart = function() {
        return true;
      };
      if (this.dragging) {
        $(document).unbind("mousemove", this.documentMouseMoveDelegate);
        $(document).unbind("mouseup", this.documentMouseUpDelegate);
        this.dragging = false;
      }
      return true;
    };

    SliderComponent.prototype.init_mouse_handlers = function() {
      var _this = this;
      return this.slider_well.bind("mousedown", this.documentMouseUpDelegate = function(e) {
        return _this.handle_mousedown(e);
      });
    };

    return SliderComponent;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.SliderComponent = SliderComponent;

  Thermometer = (function() {

    function Thermometer(dom_id, initial_value, min, max) {
      this.dom_id = dom_id != null ? dom_id : "#thermometer";
      this.min = min;
      this.max = max;
      this.resize = __bind(this.resize, this);
      this.dom_element = $(this.dom_id);
      this.dom_element.addClass('thermometer');
      this.samples = [];
      this.samples.push(initial_value);
      this.value = initial_value;
      this.first_sample = true;
      this.last_draw_time = new Date().getTime();
      this.sample_interval_ms = 250;
      this.last_draw_time -= this.sample_interval_ms;
      this.init_view();
    }

    Thermometer.prototype.init_view = function() {
      var midpoint;
      this.width = this.dom_element.width();
      this.height = this.dom_element.height();
      midpoint = this.width / 2;
      this.y1 = this.height;
      this.y2 = 0;
      this.x1 = this.x2 = midpoint;
      this.init_thermometer_fill();
      return d3.select('#therm_text').attr('class', 'therm_text');
    };

    Thermometer.prototype.init_thermometer_fill = function() {
      this.thermometer_fill = $('<div>').addClass('thermometer_fill');
      this.dom_element.append(this.thermometer_fill);
      return this.redraw();
    };

    Thermometer.prototype.resize = function() {
      var midpoint;
      this.width = this.dom_element.width();
      this.height = this.dom_element.height();
      midpoint = this.width / 2;
      this.y1 = this.height;
      this.y2 = 0;
      this.x1 = this.x2 = midpoint;
      return this.redraw();
    };

    Thermometer.prototype.set_scaled_value = function(v) {
      var results;
      results = this.value;
      results = results * (this.max - this.min);
      results = results + this.min;
      return results;
    };

    Thermometer.prototype.scaled_value = function() {
      var results;
      results = this.value;
      results = results * (this.max - this.min);
      results = results + this.min;
      return results;
    };

    Thermometer.prototype.time_to_redraw = function() {
      var timestamp;
      timestamp = new Date().getTime();
      return timestamp > this.last_draw_time + this.sample_interval_ms;
    };

    Thermometer.prototype.add_value = function(new_value) {
      this.samples.push(new_value);
      this.value = new_value;
      if (this.time_to_redraw() || this.first_sample) {
        this.first_sample = false;
        this.redraw();
        return this.samples = [];
      }
    };

    Thermometer.prototype.get_avg = function() {
      var sample, total, _i, _len, _ref;
      if (this.samples.length > 0) {
        total = 0;
        _ref = this.samples;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          sample = _ref[_i];
          total = total + sample;
        }
        return this.value = total / this.samples.length;
      } else {
        return this.value;
      }
    };

    Thermometer.prototype.scaled_display_value = function() {
      return (this.get_avg() / (this.max - this.min)) * this.height;
    };

    Thermometer.prototype.redraw = function() {
      var midpoint, value;
      this.width = this.dom_element.width();
      this.height = this.dom_element.height();
      midpoint = this.width / 2;
      this.y1 = this.height;
      this.y2 = 0;
      this.x1 = this.x2 = midpoint;
      value = this.scaled_display_value();
      this.thermometer_fill.css("bottom", "" + (value - this.height) + "px");
      this.thermometer_fill.height("" + value + "px");
      this.last_draw_time = new Date().getTime();
      return d3.select('#therm_text').text("Temperature");
    };

    return Thermometer;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.Thermometer = Thermometer;

}).call(this);

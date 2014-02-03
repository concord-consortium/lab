/*global define: false */

define(function() {

  // Dead-simple, non-hierarchical state machine to which you dispatch events. The state machine is
  // in one state at a time (once the initial state is specified) and each event you ask it to
  // dispatch is simply handled by the current state's handler for that event (i.e.., the state's
  // method having the same name of the event). If the current state defines no handler by that
  // name, the event is ignored. Each handler can transition the state machine to a different state
  // by invoking 'this.gotoState(<name of new state>)' in which case the old state's 'leaveState'
  // method will be called, the new state will become the current state, and the new state's
  // 'enterState' method will be called. A state's enterState method can also call this.gotoState
  // (for example, after checking some condition) in which case, the "new, new" state will become
  // the current state. However, remember that this implementation is simple: any code in the
  // enterState method after gotoState will run with the "new, new" state as the current state --
  // not the same state in which the enterState method is defined. Additionally, if you go to a
  // state from itself, the enterState method will simply run again.

  // You configure the state machine by passing its constructor an object having each state as the
  // child objects. Each state's name is taken from the its key in that parent object, and the
  // constructor simply endows each state with a 'name' property and a 'gotoState' method. Each
  // state object should define a method for each event it will handle. Events passed to
  // stateMachine.handleEvent which do not correspond to a method in the current state ware simply
  // ignored. (handleEvent returns true if the state has a handler for the event, false otherwise.)

  // Usage:
  // var stateMachine = new StateMachine({
  //   state1: {
  //     enterState: function() {
  //       console.log("entered state 1");
  //     },
  //     leaveState: function() {
  //       console.log("leaving state 1");
  //     },
  //     switchState: function() {
  //       this.gotoState('state2');
  //     }
  //   },

  //   state2: {
  //     enterState: function() {
  //       console.log("entered state 2");
  //     }
  //   }
  // });

  // > stateMachine.gotoState('state1');
  // entered state 1
  // undefined
  // > stateMachine.handleEvent('switchState');
  // leaving state 1
  // entered state 2
  // false


  function StateMachine(states) {
    var self = this;

    this.states = states;
    this.currentState = null;

    Object.keys(states).forEach(function(key) {
      var state = states[key];
      // for debugging purposes
      if (state.name !== undefined && state.name !== key) {
        throw new Error("State " + key + " already has a 'name' property. The 'name' property is reserved.");
      }
      state.name = key;

      if (state.gotoState !== undefined) {
        throw new Error("State " + key + " already has a 'gotoState' property. The 'gotoState' property is reserved.");
      }
      state.gotoState = function(toStateName) {
        if (this !== self.currentState) {
          throw new Error("gotoState was called on state " + this.name + " but the current state is ", self.getCurrentStateName());
        }
        // just call the prototype method
        self.gotoState(toStateName);
      };

    });
  }


  StateMachine.prototype.getCurrentStateName = function() {
    if (this.currentState) {
      return this.currentState.name;
    } else {
      return "<no state>";
    }
  };


  StateMachine.prototype.gotoState = function(toStateName) {
    var toState = this.states[toStateName];
    if ( ! toState ) {
      throw new Error("gotoState was called with state name " + toStateName + " but no such state exists.");
    }

    if (this.currentState && typeof this.currentState.leaveState === 'function') {
      this.currentState.leaveState();
    }

    this.currentState = toState;

    if (typeof this.currentState.enterState === 'function') {
      this.currentState.enterState();
    }
  };


  StateMachine.prototype.handleEvent = function(eventName /*, eventArgs... */) {
    var eventArgs = Array.prototype.slice.call(arguments, 1);

    if (typeof this.currentState[eventName] === 'function') {
      this.currentState[eventName].apply(this.currentState, eventArgs);
      return true;
    }
    return false;
  };


  return StateMachine;

});


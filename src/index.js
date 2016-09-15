/*\
|*| ****************************** CAVEAT ******************************
|*| !!! RESOLVING thenables IN promise-valued actions IS PERMITTED.
|*| *************************** NEVERTHELESS ***************************
|*| !!! I AM STRONGLY AGAINST SUCH USAGE !!!
|*| !!! I AM STRONGLY AGAINST SUCH USAGE !!!
|*| !!! I AM STRONGLY AGAINST SUCH USAGE !!!
|*| ********* RECOMMENDED STYLE FOR promise-valued actions IS **********
|*| !!! SIMPLY `resolve(normal || function-valued actions)` !!!
\*/

export default function ({dispatch, getState}) {
  return (next) => {
    function _dispatch(action) {
      if (typeof action === 'function') {
        action(dispatch, getState);
        return;
      } else if (typeof action === 'object' && typeof action.promise === 'function') {
        // Assume `action.promise` is a function that returns a promise
        return _dispatch(action.promise());
      } else if (typeof action === 'object' && typeof action.then === 'function') {
        // The case that `action` is a thenable:
        //
        // `action` can also resolve a thenable. However,
        // `action` shouldn't reject a thenable, becase `action` won't
        // wait for this thenable being settled before it is rejected.
        //
        // if `action` resolves a thenable, `action` is then resolved
        // or rejected only after the thenable is resolved or rejected.
        // Notice that this thenable shouldn't reject a thenable
        // due to the reason stated above.
        return action.then(
          (successAction) => {
            // If `action` resolves a thenable, this thenable won't get
            // dispatched here. It will wait for this thenable being
            // finally resolved or rejected. If the thenable is resolved,
            // this resolved value will be assigned to `successAction`
            // which will be dispatched afterwards. If the thenable is
            // rejected, this callback won't even get called. In fact,
            // the rejected reason will be assigned to `failureAction`
            // below and the second callback will be called.
            return _dispatch(successAction);
          },
          (failureAction) => {
            // Forbids the rejected `failureAction` to be a thenable
            if (
              typeof failureAction === 'object' &&
              typeof failureAction.then === 'function'
            ) {
              console.warn(
                'The rejected action should not be thenable. ' +
                'This action was not dispatched...'
              );
              return failureAction;
            }
            return _dispatch(failureAction);
          }
        );
      } else {
        // `action` isn't a promise
        next(action);
        return;
      }
    }

    return (actions) => {
      // Multi-actions are dispatched
      if (actions instanceof Array) {
        return actions.reduce((prev, action) =>
          prev ? prev.then(() => _dispatch(action)) : _dispatch(action),
          null
        );
      }

      // Only one action is dispatched
      if (actions) {
        return _dispatch(actions);
      }

      // None is dispatched, let `next` dispatcher handle it
      return next();
    }
  }
}

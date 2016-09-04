/*\
|*| ****************************** CAVEAT ******************************
|*| !!! RESOLVING thenables IN promise-valued actions IS PERMITTED.
|*| *************************** NEVERTHELESS ***************************
|*| !!! I AM STRONGLY AGAINST SUCH USAGE !!!
|*| !!! I AM STRONGLY AGAINST SUCH USAGE !!!
|*| !!! I AM STRONGLY AGAINST SUCH USAGE !!!
|*| *********** RECOMMENDED STYLE FOR promise-valued actions ***********
|*| !!! SIMPLY resolve normal actions !!!
\*/

export default function ({dispatch, getState}) {
  return (next) => {
    function _dispatch(action) {
      if (typeof action === 'object' && typeof action.promise === 'function') {
        // Assume `action.promise` is a function that returns a promise
        _dispatch(action.promise());
      } else if (typeof action === 'object' && typeof action.then === 'function') {
        // `action` is a thenable:
        //
        // `action` can resolve a thenable. However, `action` shouldn't
        // reject a thenable, becase it gets rejected immediately when
        // the `reject` function is called regardless of whether this
        // thenable is settled.
        //
        // If `action` resolves a thenable, `action` is then resolved
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
              console.error(
                'The rejected action should not be thenable. ' +
                'This action was not dispatched...'
              );
              return failureAction;
            }
            return _dispatch(failureAction);
          }
        );
      } else {
        // `action` neither is nor generates a promise
        return Promise.resolve(next(action));
      }
    }

    return (actions) => {
      // An array of actions is dispatched
      if (actions instanceof Array) {
        return actions.reduce((progress, action) => {
          return progress.then(() => _dispatch(action));
        }, Promise.resolve());
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

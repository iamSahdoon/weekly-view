import { Component } from "react";

// The 500 state's mechanism (frontend_architecture.md §9.17; design §3.13): a page that
// throws while rendering is replaced by `fallback`, and whatever surrounds the boundary
// stays usable. React offers error boundaries only as classes. What the fallbacks look
// like is in ErrorStates.jsx.
//
//   fallback  a component taking { reset } — what to render in place of the crashed subtree
//   resetKey  when it changes (the path, for a boundary that outlives its page) the
//             boundary tries its children again

export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // The only place the cause is kept: the screen says what happened, not why.
    console.error("A page failed to render.", error, info?.componentStack);
  }

  componentDidUpdate(previous) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  reset = () => this.setState({ failed: false });

  render() {
    if (this.state.failed) {
      const Fallback = this.props.fallback;
      return <Fallback reset={this.reset} />;
    }
    return this.props.children;
  }
}

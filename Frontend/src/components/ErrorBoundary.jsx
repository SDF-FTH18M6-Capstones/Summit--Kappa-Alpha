
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // connect an error logging service here later.
    console.error("Application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-green-950">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm text-gray-500">
              An unexpected error occurred while loading this page.
              Please try again.
            </p>

            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="mt-6 rounded-lg bg-green-800 px-5 py-2.5 font-medium text-white hover:bg-green-900"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}



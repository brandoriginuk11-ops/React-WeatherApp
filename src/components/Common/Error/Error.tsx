import React from "react";
import "./Error.scss";

interface ErrorProps {
  error: any;
}

export const Error = ({ error }: ErrorProps) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong while loading weather data.";

  return (
    <div className="error-container">
      <img
        src={require("../../../resources/error.png")}
        className="error-image"
        alt="Error"
      />
      <div className="error-title">Error</div>
      <div className="error-message">{message}</div>
    </div>
  );
};

export const ErrorHandler = (
  error: any,
  info: { componentStack: string }
) => {
  console.error("Weather App Error:", {
    message: error?.message,
    response: error?.response?.data,
    stack: error?.stack,
    componentStack: info?.componentStack,
  });
};

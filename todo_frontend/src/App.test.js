import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the app title", () => {
  render(<App />);
  const heading = screen.getByRole("heading", { name: /retro todo terminal/i });
  expect(heading).toBeInTheDocument();
});

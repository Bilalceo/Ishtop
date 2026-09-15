/**
 * A stat tile must show the real number even when no animation ever runs.
 *
 * requestAnimationFrame is not serviced in a hidden tab, so the count-up used
 * to start at 0 and never arrive: a dashboard opened in a background tab
 * reported 1 resume and 1 application as 0 and 0.
 */

import { render, screen, act } from "@testing-library/react";
import { StatCard } from "@/components/student/StatCard";
import { FileText } from "lucide-react";

const renderCard = (value: number, loading = false) =>
  render(
    <StatCard label="Jami rezyumelar" value={value} Icon={FileText} loading={loading} />
  );

describe("StatCard", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the real number when no frame is ever painted", () => {
    // Fake timers install their own requestAnimationFrame, so the stub has to
    // go on afterwards; otherwise the animation quietly runs to completion and
    // the test proves nothing. A rAF that never calls back is a hidden tab.
    jest.useFakeTimers();
    const rafSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 0);
    renderCard(7);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText("7")).toBeInTheDocument();
    rafSpy.mockRestore();
  });

  it("never leaves a real count sitting at zero", () => {
    jest.useFakeTimers();
    const rafSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 0);
    renderCard(42);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    rafSpy.mockRestore();
  });

  it("still animates to the exact value when frames do run", () => {
    jest.useFakeTimers();
    renderCard(42);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders a placeholder, never a zero, while loading", () => {
    renderCard(3, true);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("follows the value when it changes after mount", () => {
    jest.useFakeTimers();
    const { rerender } = renderCard(0);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    rerender(<StatCard label="Jami rezyumelar" value={5} Icon={FileText} />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

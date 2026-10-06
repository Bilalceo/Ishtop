/**
 * The install banner picks one of three messages, and the choice is the whole
 * point: Apple exposes no install API, so an iPhone must be told the manual
 * steps — and told them only when it is in Safari, because that is the only
 * iOS browser with "Add to Home Screen" in the share sheet.
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import InstallPrompt from "@/components/pwa/InstallPrompt";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    aside: ({ children, initial, animate, exit, transition, ...r }: any) => <aside {...r}>{children}</aside>,
    div: ({ children, initial, animate, exit, transition, ...r }: any) => <div {...r}>{children}</div>,
  },
}));

const post = jest.fn().mockResolvedValue({});
jest.mock("@/lib/api", () => ({ __esModule: true, default: { post: (...a: unknown[]) => post(...a) } }));

const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

function setUA(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
}

beforeEach(() => {
  jest.useFakeTimers();
  post.mockClear();
  localStorage.clear();
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
    addListener: jest.fn(), removeListener: jest.fn(), dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => jest.useRealTimers());

function fireBeforeInstallPrompt() {
  const e: Event & { prompt?: () => Promise<void>; userChoice?: Promise<unknown> } =
    new Event("beforeinstallprompt");
  e.prompt = jest.fn().mockResolvedValue(undefined);
  e.userChoice = Promise.resolve({ outcome: "accepted" });
  act(() => { window.dispatchEvent(e); });
  return e;
}

describe("install banner", () => {
  it("shows the manual steps on an iPhone, with no Install button", () => {
    setUA(SAFARI_IPHONE);
    render(<InstallPrompt />);
    act(() => { jest.advanceTimersByTime(3000); });

    expect(screen.getByText(/Ulashish/)).toBeInTheDocument();
    expect(screen.getByText("Bosh ekranga qo'shish")).toBeInTheDocument();
    // Apple gives the page no way to install, so offering a button would lie
    expect(screen.queryByRole("button", { name: /O'rnatish/ })).toBeNull();
  });

  it("sends an iPhone on a non-Safari browser to Safari instead", () => {
    setUA(CHROME_IPHONE);
    render(<InstallPrompt />);
    act(() => { jest.advanceTimersByTime(3000); });

    expect(screen.getByText(/faqat Safari orqali ishlaydi/)).toBeInTheDocument();
    expect(screen.queryByText("Bosh ekranga qo'shish")).toBeNull();
  });

  it("shows a real Install button where the browser supports one", () => {
    setUA(CHROME_ANDROID);
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();

    expect(screen.getByRole("button", { name: /O'rnatish/ })).toBeInTheDocument();
    expect(screen.queryByText(/Ulashish/)).toBeNull();
  });

  it("nothing appears on a desktop browser that never offers an install", () => {
    setUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126.0 Safari/537.36");
    render(<InstallPrompt />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reports shown and dismissed, tagged with the platform", async () => {
    setUA(SAFARI_IPHONE);
    render(<InstallPrompt />);
    act(() => { jest.advanceTimersByTime(3000); });

    expect(post).toHaveBeenCalledWith("/pwa/event", {
      event: "pwa_prompt_shown", platform: "ios", browser: "safari",
    });

    fireEvent.click(screen.getByRole("button", { name: "Tushunarli" }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/pwa/event", {
        event: "pwa_dismissed", platform: "ios", browser: "safari",
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays away for two weeks once dismissed", () => {
    setUA(SAFARI_IPHONE);
    localStorage.setItem("ishtop_pwa_install_dismissed_v1", String(Date.now()));
    render(<InstallPrompt />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});

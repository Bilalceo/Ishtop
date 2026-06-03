/**
 * Dynamic OG image for shared /demo links.
 *
 * URL: /demo/og?s=react,typescript,tailwind
 * Output: 1200×630 PNG showing the visitor's top AI match.
 *
 * When someone shares /demo?s=…, this image renders the personalized result
 * card so the link preview on Twitter/Telegram/WhatsApp shows their match —
 * not a generic logo. Spotify Wrapped pattern.
 */

import { ImageResponse } from "next/og";
import {
  readSkillsFromUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} from "@/components/demo/url-state";
import {
  topMatches,
  SKILLS,
} from "@/components/demo/match-engine";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Reuse the URL parser so we always agree with the demo page.
  const selected = readSkillsFromUrl(searchParams.toString());
  const matches = topMatches(selected, 1);
  const top = matches[0];

  const skillLabels = selected
    .map((id) => SKILLS.find((s) => s.id === id)?.label)
    .filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0B1020",
          color: "#FFFFFF",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          position: "relative",
        }}
      >
        {/* Aurora mesh background — radial gradients composited */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(60% 60% at 18% 10%, rgba(124,92,255,0.55) 0%, transparent 60%), radial-gradient(50% 50% at 82% 0%, rgba(34,211,238,0.45) 0%, transparent 60%), radial-gradient(70% 60% at 50% 90%, rgba(245,181,68,0.18) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* Grid dot overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "64px 72px",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Brand header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, #7C5CFF 0%, #5B8CFF 50%, #22D3EE 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              ✦
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                display: "flex",
              }}
            >
              IshTop
            </div>
            <div
              style={{
                marginLeft: 16,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.85)",
                display: "flex",
              }}
            >
              AI · Live demo
            </div>
          </div>

          {/* Main message */}
          {top ? (
            <div
              style={{
                marginTop: 40,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  color: "rgba(255,255,255,0.65)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  display: "flex",
                }}
              >
                Mening AI match natijam
              </div>
              <div
                style={{
                  fontSize: 68,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0 18px",
                  maxWidth: 1000,
                }}
              >
                <span>{top.job.title}</span>
              </div>
              <div
                style={{
                  fontSize: 30,
                  color: "rgba(255,255,255,0.72)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <span>{top.job.company}</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                <span>{top.job.location}</span>
              </div>

              {/* Match score + skills */}
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                }}
              >
                <div
                  style={{
                    width: 180,
                    padding: "18px 24px",
                    borderRadius: 20,
                    background:
                      "linear-gradient(140deg, rgba(60,203,127,0.22), rgba(34,211,238,0.12))",
                    border: "1px solid rgba(60,203,127,0.4)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 700,
                      color: "#3CCB7F",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      display: "flex",
                    }}
                  >
                    {top.score}%
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.7)",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      fontWeight: 600,
                      display: "flex",
                    }}
                  >
                    match
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      color: "rgba(255,255,255,0.55)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      display: "flex",
                    }}
                  >
                    Sizning ko&apos;nikmalaringiz
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      maxWidth: 720,
                    }}
                  >
                    {skillLabels.slice(0, 6).map((s) => (
                      <div
                        key={s}
                        style={{
                          padding: "10px 18px",
                          borderRadius: 999,
                          background:
                            "linear-gradient(120deg, rgba(124,92,255,0.25), rgba(34,211,238,0.18))",
                          border: "1px solid rgba(255,255,255,0.16)",
                          fontSize: 22,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.95)",
                          display: "flex",
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // No skills picked — fallback aesthetic
            <div
              style={{
                marginTop: 56,
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  color: "rgba(255,255,255,0.65)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  display: "flex",
                }}
              >
                Jonli AI playground
              </div>
              <div
                style={{
                  fontSize: 80,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                  display: "flex",
                  flexWrap: "wrap",
                }}
              >
                <span>Tinglab ko&apos;ring. 5 soniyada.</span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 26,
                  color: "rgba(255,255,255,0.7)",
                  maxWidth: 880,
                  display: "flex",
                }}
              >
                Ko&apos;nikmangizni tanlang — AI o&apos;ylab, izohlab, eng mos
                vakansiyalarni topadi.
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.55)",
                display: "flex",
              }}
            >
              ishtop.uz/demo
            </div>
            <div
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 600,
                display: "flex",
              }}
            >
              Trust-first · Explainable
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

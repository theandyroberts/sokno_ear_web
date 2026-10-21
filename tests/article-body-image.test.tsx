import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Article } from "@/components/ds/Article.jsx";
import { ArticleBody } from "@/components/ArticleBody";
import { TicketLink } from "@/components/TicketLink";
import { Ticket, EpisodeSchema } from "@/lib/schema";
import episode from "@/content/episodes/2026-10-21.json";

describe("venue ticket button", () => {
  it("appears after the deck and before facts/original art, with a safe new-tab link", () => {
    const parsed = EpisodeSchema.parse(episode);
    const story = parsed.stories.find(s => s.id === "big-pink-house-party")!;
    expect(story.image).toBe("/assets/spots/dnb_sneakers_jump.jpg");
    const ticketFact = story.facts.find(f => f.label === "Tickets")!;
    expect(ticketFact.value).not.toContain("bio");
    const { container } = render(<Article title={story.title} deck={story.deck} image={story.image} ticket={story.ticket} facts={story.facts}><ArticleBody blocks={story.body} /></Article>);
    const link = screen.getByRole("link", { name: "Get tickets at The Pink Cactus (opens in a new tab)" });
    expect(link).toHaveAttribute("href", ticketFact.href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const image = screen.getByRole("img", { name: "Get tickets at The Pink Cactus" });
    expect(link).toContainElement(image);
    expect(link.textContent).toBe("Get tickets ↗");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(screen.getByText(story.deck!).compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.compareDocumentPosition(container.querySelector("dl")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.compareDocumentPosition(container.querySelector('img[src$="dnb_sneakers_jump.jpg"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const url = new URL(link.getAttribute("href")!);
    expect(url.hostname).toBe("toast.app");
    expect(url.searchParams.get("date")).toBe("2026-10-23");
    expect(url.searchParams.get("time")).toBe("21:00");
  });
  it("accepts another venue image and destination without event-specific component code", () => {
    render(<TicketLink image="/other-venue.svg" alt="Get tickets at Another Venue" href="https://example.com/tickets" />);
    expect(screen.getByRole("link", { name: /Another Venue/ })).toHaveAttribute("href", "https://example.com/tickets");
    expect(screen.getByRole("img", { name: /Another Venue/ })).toHaveAttribute("src", "/other-venue.svg");
  });
  it("rejects executable protocols and missing accessible labels", () => {
    const ticket = { image: "/ticket.svg", alt: "Get tickets", href: "https://example.com/tickets" };
    expect(Ticket.safeParse({ ...ticket, href: "javascript:alert(1)" }).success).toBe(false);
    expect(Ticket.safeParse({ ...ticket, alt: "" }).success).toBe(false);
  });
});

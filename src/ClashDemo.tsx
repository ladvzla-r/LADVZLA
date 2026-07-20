import React from "react";
import "./styles/index.css";

type Card = { id: string; name: string; image?: string };
type Deck = { id: string; name?: string; cards: Card[] };
type Player = { id: string; name: string; avatar?: string; decks: Deck[] };

const makeDeck = (i: number): Deck => ({
  id: `deck-${i}`,
  name: `Mazo ${i + 1}`,
  cards: Array.from({ length: 8 }).map((_, j) => ({ id: `c-${i}-${j}`, name: `Carta ${j + 1}` })),
});

const MOCK_PLAYERS: Player[] = [
  { id: "p1", name: "Zektro", decks: [makeDeck(0), makeDeck(1), makeDeck(2), makeDeck(3)] },
  { id: "p2", name: "NovaSky", decks: [makeDeck(0), makeDeck(1), makeDeck(2), makeDeck(3)] },
  { id: "p3", name: "Drakken", decks: [makeDeck(0), makeDeck(1), makeDeck(2), makeDeck(3)] },
  { id: "p4", name: "Pixelate", decks: [makeDeck(0), makeDeck(1), makeDeck(2), makeDeck(3)] },
];

const styles: { [k: string]: React.CSSProperties } = {
  page: { padding: 20, fontFamily: "Inter, system-ui, Arial", background: "#0f172a", minHeight: "100vh", color: "#e6eef8" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 },
  card: { background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))", borderRadius: 12, padding: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.6)" },
  playerTop: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 12, background: "#0ea5d9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#021024" },
  decks: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
  deckBox: { background: "rgba(255,255,255,0.02)", padding: 8, borderRadius: 8, minHeight: 64, display: "flex", flexDirection: "column", gap: 6 },
  cardsRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  cardDot: { width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#dbeafe" },
};

export default function ClashDemo() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.title}>Clash Royale · Demo de torneos</div>
        <div style={{ color: "#9fb3cc", marginLeft: 8 }}>Cada jugador tiene 4 mazos (placeholders)</div>
      </div>

      <div style={styles.grid}>
        {MOCK_PLAYERS.map((p) => (
          <div key={p.id} style={styles.card}>
            <div style={styles.playerTop}>
              <div style={styles.avatar}>{p.name.charAt(0)}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#9fb3cc" }}>4 mazos registrados</div>
              </div>
            </div>

            <div style={styles.decks}>
              {p.decks.map((d) => (
                <div key={d.id} style={styles.deckBox}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name}</div>
                  <div style={styles.cardsRow}>
                    {d.cards.map((c) => (
                      <div key={c.id} title={c.name} style={styles.cardDot}>
                        {c.name.split(" ")[1]}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

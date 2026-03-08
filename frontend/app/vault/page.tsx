import Nav from "../components/Nav";
import VaultApp from "./VaultApp";

export default function VaultPage() {
  return (
    <>
      <Nav />
      <main style={{ paddingTop: "80px", minHeight: "100vh" }}>
        <VaultApp />
      </main>
    </>
  );
}

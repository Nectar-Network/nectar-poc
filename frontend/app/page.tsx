import Nav from "./components/Nav";
import Hero from "./components/Hero";
import ProblemStats from "./components/ProblemStats";
import Architecture from "./components/Architecture";
import KeeperRegistry from "./components/KeeperRegistry";
import MonitorFeed from "./components/MonitorFeed";
import Footer from "./components/Footer";

export default function Page() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <ProblemStats />
      <Architecture />
      <KeeperRegistry />
      <MonitorFeed />
      <Footer />
    </main>
  );
}

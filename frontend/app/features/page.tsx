import Nav from "../components/Nav";
import FeaturesContent from "./FeaturesContent";
import Footer from "../components/Footer";

export default function FeaturesPage() {
  return (
    <>
      <Nav />
      <main style={{ paddingTop: "80px", minHeight: "100vh" }}>
        <FeaturesContent />
      </main>
      <Footer />
    </>
  );
}

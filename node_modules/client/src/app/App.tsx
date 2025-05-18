import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/widgets/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { JoinPage } from "@/pages/JoinPage";

export const App = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join" element={<JoinPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

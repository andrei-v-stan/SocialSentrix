import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Header, Footer, Home, About, Redir, Test, ManageSessions, ParseResponse } from './components/components.js';
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-container">
        {<Header />}
        <main className="app-main">
          <Routes>
            <Route path="/test" element={<Test />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<Home />} />
            <Route path="/parse" element={<ParseResponse />} />
            <Route path="/managesessions" element={<ManageSessions />} />
            <Route path="*" element={<Redir />} />
          </Routes>
        </main>
        {<Footer />}
      </div>
    </Router>
  );
}

export default App
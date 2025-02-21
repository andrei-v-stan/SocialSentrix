import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, About, Test } from './components/components.js';
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* <Header /> */}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/test" element={<Test />} />
          </Routes>
        </main>
        {/* <Footer /> */}
      </div>
    </Router>
  );
}

export default App
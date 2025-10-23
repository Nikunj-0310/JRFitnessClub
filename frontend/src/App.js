import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/components/Dashboard";

function App() {
  return (
    <div className="App">
      {/* Add top margin for OS buttons (status bar, notch area) */}
      <div className="pt-8 pb-8">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
}

export default App;

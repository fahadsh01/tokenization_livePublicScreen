import { Routes, Route } from "react-router-dom";
import PublicTokenScreen from "./publicLiveToken";

function App() {
  return (
    <Routes>
      <Route
        path="/public/:tenantId"
        element={<PublicTokenScreen />}
      />
    </Routes>
  );
}

export default App;

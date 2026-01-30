import React from "react";
import { Routes, Route } from "react-router-dom";
import PublicTokenScreen from "./publicLiveToken";
function App() {
  return (
    <Routes>
      <Route
        path="/:tenantId/publicLiveToken"
        element={<PublicTokenScreen />}
      />
    </Routes>
  );
}

export default App;

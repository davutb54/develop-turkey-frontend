import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home'; // Yeni
import ProblemDetail from './pages/ProblemDetail';
import CreateProblem from './pages/CreateProblem';
import Profile from './pages/Profile';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} /> {/* Güncellendi */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/problem/:id" element={<ProblemDetail />} />
      <Route path="/create-problem" element={<CreateProblem />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default App;
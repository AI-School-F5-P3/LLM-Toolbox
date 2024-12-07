import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home/Home';
import Blog from './pages/Blog/Blog';
import Post from './pages/Post/Post';
import Scientific from './pages/Scientific/Scientific';
import Financial from './pages/Financial/Financial';
import AboutUs from './pages/AboutUs/AboutUs';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/post" element={<Post />} />
          <Route path="/scientific" element={<Scientific />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/about" element={<AboutUs />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;


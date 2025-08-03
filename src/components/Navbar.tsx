import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const Navbar = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollThreshold = documentHeight - windowHeight - 100; // Show navbar 100px before the end

      if (scrollY >= scrollThreshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${isVisible ? 'visible' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <Sparkles size={32} color="#fff" />
          <span className="logo-text">ADVIBE</span>
        </div>
        <ul className="navbar-links">
          <li><a href="#contact">Contact</a></li>
          <li><a href="#portfolio">Portfolio</a></li>
          <li><a href="#about">About Us</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

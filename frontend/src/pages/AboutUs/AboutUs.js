import React from 'react';
import './AboutUs.css';
import companyImage from './picture.png';

const AboutUs = () => {
  return (
    <div className="about-container">
      <div className="about-content">
        <div className="content-left">
          <h1>About Us</h1>
          
          <div className="about-description">
            <p>We are pioneers in AI development, crafting innovative solutions that transform businesses. Our customer-centric approach ensures that every solution we deliver is tailored to meet specific needs while pushing the boundaries of technological advancement.</p>
            
            <p>Our team combines cutting-edge AI expertise with deep industry knowledge to deliver solutions that drive real business value. We believe in collaborative innovation and maintaining close partnerships with our clients throughout their AI journey.</p>
          </div>

          <div className="cto-section">
            <h2>Contact</h2>
            <div className="cto-info">
              <h3>José A Rodríguez</h3>
              <p className="position">Chief Technology Officer</p>
              <p className="contact">
                <a href="mailto:joserodr68@gmail.com">joserodr68@gmail.com</a>
              </p>
            </div>
          </div>
        </div>

        <div className="content-right">
          <div className="company-image">
            <img src={companyImage} alt="Company" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
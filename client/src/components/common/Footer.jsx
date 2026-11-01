import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ShieldCheck, GraduationCap } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Footer Component
 * Clean, dark modern footer with service links, quick navigation, and academic credits
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          {/* Brand Column */}
          <div className="footer-brand">
            <div className="brand-logo" style={{ color: '#ffffff' }}>
              <div className="brand-logo-icon">
                <img src="/logo.png" alt="ServeEase Logo" />
              </div>
              <span>Serve<span style={{ color: '#4ade80' }}>Ease</span></span>
            </div>
            <p>
              Reliable local services, made simple. Connecting homeowners and businesses with verified, skilled neighborhood professionals.
            </p>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{ backgroundColor: '#1e293b', color: '#4ade80', border: '1px solid #334155' }}>
                <ShieldCheck size={12} /> Verified Techs
              </span>
              <span className="badge" style={{ backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #334155' }}>
                Upfront Pricing
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/" className="footer-link">Home</Link></li>
              <li><Link to="/services" className="footer-link">Browse Services</Link></li>
              <li><Link to="/about" className="footer-link">About ServeEase</Link></li>
              <li><Link to="/contact" className="footer-link">Contact & Support</Link></li>
              <li><Link to="/terms" className="footer-link">Terms of Service</Link></li>
              <li><Link to="/privacy" className="footer-link">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Popular Categories */}
          <div>
            <h4 className="footer-heading">Services</h4>
            <ul className="footer-links">
              <li><Link to="/services?category=plumber" className="footer-link">Plumber Services</Link></li>
              <li><Link to="/services?category=electrician" className="footer-link">Electrician Repairs</Link></li>
              <li><Link to="/services?category=cleaning" className="footer-link">Deep Home Cleaning</Link></li>
              <li><Link to="/services?category=appliance-repair" className="footer-link">AC & Appliance Repair</Link></li>
              <li><Link to="/services?category=carpenter" className="footer-link">Carpentry & Furniture</Link></li>
              <li><Link to="/services?category=mechanic" className="footer-link">Vehicle Mechanics</Link></li>
            </ul>
          </div>

          {/* Contact & Academic Project Info */}
          <div>
            <h4 className="footer-heading">Project Info</h4>
            <ul className="footer-links">
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
                <GraduationCap size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                <span>3rd Year B.Tech Mini-Project</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.88rem' }}>
                <Mail size={16} style={{ flexShrink: 0 }} />
                <span>support@serveease.local</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.88rem' }}>
                <Phone size={16} style={{ flexShrink: 0 }} />
                <span>+91 98765 43210</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.88rem' }}>
                <MapPin size={16} style={{ flexShrink: 0 }} />
                <span>Campus Tech Park, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <p>© {CURRENT_YEAR} ServeEase. All rights reserved. Built for College Academic Evaluation.</p>
            <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.82rem' }}>
              <Link to="/terms" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Terms</Link>
              <Link to="/privacy" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Privacy</Link>
            </div>
          </div>
          <div className="footer-academic-badge">
            <span>Stack: MERN (React, Vite, Vanilla CSS, Node/Express)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

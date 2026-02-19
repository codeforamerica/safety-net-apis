import { Routes, Route, Link } from 'react-router-dom';
import { Header, Title, NavMenuButton, PrimaryNav } from '@trussworks/react-uswds';
import { useState } from 'react';
import { RoleProvider, useRole } from './context/RoleContext';
import { routes } from './config/routes';
import { ContractPage } from './pages/ContractPage';

function RoleSelector() {
  const { role, setRole } = useRole();
  return (
    <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
      <option value="applicant">Applicant</option>
      <option value="caseworker">Caseworker</option>
      <option value="reviewer">Reviewer</option>
    </select>
  );
}

export function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = routes.map((r) => (
    <Link key={r.path} to={r.path} className="usa-nav__link">
      {r.contract}
    </Link>
  ));

  return (
    <RoleProvider>
      <Header basic>
        <div className="usa-nav-container">
          <div className="usa-navbar">
            <Title>Safety Net Mock App</Title>
            <NavMenuButton
              label="Menu"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            />
          </div>
          <PrimaryNav
            items={navItems}
            mobileExpanded={mobileNavOpen}
            onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <RoleSelector />
          </PrimaryNav>
        </div>
      </Header>
      <main className="grid-container padding-y-4">
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={<ContractPage route={r} />} />
          ))}
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </RoleProvider>
  );
}

function Home() {
  return (
    <div>
      <h1>Safety Net Mock App</h1>
      <p>Select a route from the navigation above, or:</p>
      <ul>
        {routes.map((r) => (
          <li key={r.path}>
            <Link to={r.path}>{r.contract}</Link> — {r.type}
          </li>
        ))}
      </ul>
    </div>
  );
}

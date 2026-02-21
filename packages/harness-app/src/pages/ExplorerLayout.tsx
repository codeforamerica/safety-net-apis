import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';
import { SideNav, Alert } from '@trussworks/react-uswds';
import { useManifest } from '../hooks/useManifest';

export function ExplorerLayout() {
  const { apis, loading, error } = useManifest();
  const { apiName } = useParams();

  if (loading) {
    return <p className="usa-prose">Loading API manifest...</p>;
  }

  if (error) {
    return (
      <Alert type="error" headingLevel="h3" heading="Failed to load API manifest">
        {error}
      </Alert>
    );
  }

  if (apis.length === 0) {
    return <p className="usa-prose">No APIs discovered.</p>;
  }

  // Default to first API if none selected
  if (!apiName) {
    return <Navigate to={`/explore/${apis[0].name}`} replace />;
  }

  const navItems = apis.map((api) => (
    <NavLink
      key={api.name}
      to={`/explore/${api.name}`}
      className={({ isActive }) =>
        `usa-sidenav__item${isActive ? ' usa-current' : ''}`
      }
      end={false}
    >
      {api.title}
    </NavLink>
  ));

  return (
    <div className="grid-row grid-gap">
      <div className="grid-col-3">
        <SideNav items={navItems} />
      </div>
      <div className="grid-col-9">
        <Outlet context={{ apis }} />
      </div>
    </div>
  );
}

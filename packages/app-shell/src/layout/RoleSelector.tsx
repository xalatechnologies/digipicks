/**
 * RoleSelector - Presentational role selection for dual-role users.
 * Host app provides grantedRoles and setEffectiveRole from RoleProvider.
 */

import { useState } from 'react';
import { Button, Checkbox, Heading, Paragraph, ShieldCheckIcon, ClipboardListIcon } from '@digipicks/ds';
import type { PlatformRole } from '@digipicks/app-shell';

import styles from './RoleSelector.module.css';

export interface RoleSelectorProps {
  grantedRoles: PlatformRole[];
  setEffectiveRole: (role: PlatformRole, remember?: boolean) => void;
  onRoleSelect?: (role: PlatformRole) => void;
  showRememberChoice?: boolean;
  className?: string;
}

export function RoleSelector({
  grantedRoles,
  setEffectiveRole,
  onRoleSelect,
  showRememberChoice = true,
  className,
}: RoleSelectorProps) {
  const [rememberChoice, setRememberChoice] = useState(false);

  const handleRoleSelect = (role: PlatformRole) => {
    if (!grantedRoles.includes(role)) return;
    setEffectiveRole(role, rememberChoice);
    onRoleSelect?.(role);
  };

  const isRoleAvailable = (role: PlatformRole) => grantedRoles.includes(role);

  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      <Heading level={2} data-size="lg" className={styles.title}>
        Velg rolle
      </Heading>
      <Paragraph data-size="md" className={styles.subtitle}>
        Du har tilgang til flere roller. Velg hvordan du vil fortsette.
      </Paragraph>

      <div className={styles.options}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleRoleSelect('admin')}
          disabled={!isRoleAvailable('admin')}
          className={styles.option}
        >
          <div className={styles.optionIcon}>
            <ShieldCheckIcon size={24} />
          </div>
          <div>
            <div className={styles.optionTitle}>Administrator</div>
            <div className={styles.optionDesc}>Full tilgang til alle funksjoner og innstillinger</div>
          </div>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleRoleSelect('subscriber')}
          disabled={!isRoleAvailable('subscriber')}
          className={styles.option}
        >
          <div className={styles.optionIcon}>
            <ClipboardListIcon size={24} />
          </div>
          <div>
            <div className={styles.optionTitle}>Bruker</div>
            <div className={styles.optionDesc}>Standard tilgang for leietakere og brukere</div>
          </div>
        </Button>
      </div>

      {showRememberChoice && (
        <div className={styles.remember}>
          <Checkbox
            aria-labelledby="remember-choice-label"
            checked={rememberChoice}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberChoice(e.target.checked)}
            value="remember"
          >
            <span id="remember-choice-label">Husk mitt valg</span>
          </Checkbox>
        </div>
      )}
    </div>
  );
}

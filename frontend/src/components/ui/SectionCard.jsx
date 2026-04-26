import React from 'react'
import PropTypes from 'prop-types' // 1. REQUIRE YERİNE IMPORT EKLEDİK
import styles from './SectionCard.module.css'

/**
 * SectionCard - Reusable container for form sections and feature blocks.
 * Used across admin pages and student pages for consistent layout.
 */
export function SectionCard({ title, description, children }) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node,
}

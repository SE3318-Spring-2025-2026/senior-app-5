import React from 'react'
import PropTypes from 'prop-types' 
import styles from './SectionCard.module.css' 
/**
 * StatusBlock - Display success or error messages in a styled container.
 * Renders conditionally only when message is provided.
 *
 * @param {string} title - Bold label for the message (e.g., "Create Group")
 * @param {string} message - Message content to display
 * @param {string} type - Either 'success' or 'error' (default: 'success')
 */
export function StatusBlock({ title, message, type = 'success' }) {
  if (!message) return null

  return (
    <div className={`${styles.statusBlock} ${type === 'error' ? styles.error : styles.success}`}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  )
}

StatusBlock.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  type: PropTypes.oneOf(['success', 'error']),
}

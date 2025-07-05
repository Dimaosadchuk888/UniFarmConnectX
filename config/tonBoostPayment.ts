/**
 * Configuration for TON Boost payment settings
 */

// TON receiver address for Boost payments
// Can be overridden by environment variable
export const TON_BOOST_RECEIVER_ADDRESS = 
  process.env.TON_BOOST_RECEIVER_ADDRESS || 
  'UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8';

// Export for easy access
export function getTonBoostReceiverAddress(): string {
  return TON_BOOST_RECEIVER_ADDRESS;
}
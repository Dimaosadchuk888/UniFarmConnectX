"use strict";
/**
 * Configuration for TON Boost payment settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TON_BOOST_RECEIVER_ADDRESS = void 0;
exports.getTonBoostReceiverAddress = getTonBoostReceiverAddress;
// TON receiver address for Boost payments
// Can be overridden by environment variable
exports.TON_BOOST_RECEIVER_ADDRESS = process.env.TON_BOOST_RECEIVER_ADDRESS ||
    'UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8';
// Export for easy access
function getTonBoostReceiverAddress() {
    return exports.TON_BOOST_RECEIVER_ADDRESS;
}

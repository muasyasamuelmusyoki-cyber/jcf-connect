
const express = require('express');
const router = express.Router();

function getLicensingModules() {
  if (!process.env.LICENSING_DATABASE_URL) {
    const error = new Error('Licensing is not configured.');
    error.status = 503;
    throw error;
  }

  return require('../licensing-service');
}

router.post('/activate', async (req, res) => {
  try {
    const {
      key,
      installationId,
      deviceLabel,
      appVersion
    } = req.body || {};

    if (typeof key !== 'string' || key.trim().length < 20) {
      return res.status(400).json({
        success: false,
        reason: 'invalid_key',
        error: 'Enter a valid activation key.'
      });
    }

    if (
      typeof installationId !== 'string' ||
      !/^[a-zA-Z0-9_-]{16,128}$/.test(installationId)
    ) {
      return res.status(400).json({
        success: false,
        reason: 'invalid_installation_id',
        error: 'The device installation ID is invalid.'
      });
    }

    if (
      deviceLabel != null &&
      (typeof deviceLabel !== 'string' || deviceLabel.length > 200)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid device label.'
      });
    }

    if (
      appVersion != null &&
      (typeof appVersion !== 'string' || appVersion.length > 50)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid application version.'
      });
    }

    const service = getLicensingModules();

    const result = await service.activateInstallation({
      key: key.trim(),
      installationId,
      deviceLabel: deviceLabel || null,
      appVersion: appVersion || null
    });

    if (!result.success) {
      const messages = {
        invalid_key: 'The activation key is invalid.',
        invalid_installation_id: 'The device ID is invalid.',
        revoked: 'This licence has been revoked.',
        expired: 'This licence has expired.',
        installation_limit_reached:
          'This licence has reached its device limit.'
      };

      return res.status(403).json({
        success: false,
        reason: result.reason,
        error: messages[result.reason] ||
          'Activation could not be completed.'
      });
    }

    return res.json({
      success: true,
      message: 'JCF Connect has been activated successfully.',
      licenseId: result.licenseId,
      expiresAt: result.expiresAt
    });
    } catch (error) {
    console.error('License activation error:', error.message);

    return res.status(error.status || 500).json({
      success: false,
      error: error.status === 503
        ? error.message
        : 'Activation could not be completed. Please try again.'
    });
  }
});

module.exports = router;
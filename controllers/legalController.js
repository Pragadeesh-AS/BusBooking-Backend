const LegalDocument = require("../models/LegalDocument");
const { AppError } = require("../middleware/errorHandler");

// @desc    Get legal document by type
// @route   GET /api/legal/:type
// @access  Public
exports.getLegalDocument = async (req, res, next) => {
  try {
    const { type } = req.params;

    if (!["terms", "privacy"].includes(type)) {
      return next(new AppError("Invalid document type", 400));
    }

    const document = await LegalDocument.findOne({ type, isActive: true });

    if (!document) {
      return next(
        new AppError(
          `${
            type === "terms" ? "Terms & Conditions" : "Privacy Policy"
          } not found`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update legal document (Admin only)
// @route   POST /api/legal
// @access  Private/Admin
exports.createOrUpdateLegalDocument = async (req, res, next) => {
  try {
    const { type, title, content, version, effectiveDate } = req.body;

    if (!type || !title || !content) {
      return next(new AppError("Please provide type, title, and content", 400));
    }

    // Check if document exists
    let document = await LegalDocument.findOne({ type });

    if (document) {
      // Update existing document
      document.title = title;
      document.content = content;
      document.version = version || document.version;
      document.effectiveDate = effectiveDate || document.effectiveDate;
      await document.save();
    } else {
      // Create new document
      document = await LegalDocument.create({
        type,
        title,
        content,
        version,
        effectiveDate,
      });
    }

    res.status(document.isNew ? 201 : 200).json({
      success: true,
      message: `${type === "terms" ? "Terms & Conditions" : "Privacy Policy"} ${
        document.isNew ? "created" : "updated"
      } successfully`,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all legal documents (Admin only)
// @route   GET /api/legal
// @access  Private/Admin
exports.getAllLegalDocuments = async (req, res, next) => {
  try {
    const documents = await LegalDocument.find();

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete legal document (Admin only)
// @route   DELETE /api/legal/:type
// @access  Private/Admin
exports.deleteLegalDocument = async (req, res, next) => {
  try {
    const { type } = req.params;

    const document = await LegalDocument.findOne({ type });

    if (!document) {
      return next(new AppError("Document not found", 404));
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

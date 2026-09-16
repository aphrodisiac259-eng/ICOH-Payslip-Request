/**
 * ICOH Portal - Payslip Upload & Certification Modal
 * Implements strict PDF validation, verification gates, and confirmation steps.
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PayslipRequest, Payslip } from '../../types';
import { uploadPayslipDocument } from '../../services/storageService';
import { validatePayslipFile } from '../../utils/validation';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';
import { getMonthName, formatFileSize } from '../../utils/formatting';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Building,
  ShieldCheck,
} from 'lucide-react';

interface PayslipUploadModalProps {
  request: PayslipRequest;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payslip: Payslip) => void;
  isReplacement?: boolean;
}

export const PayslipUploadModal: React.FC<PayslipUploadModalProps> = ({
  request,
  isOpen,
  onClose,
  onSuccess,
  isReplacement = false,
}) => {
  const { user, adminProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePayslipFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file format. Only PDF files are permitted.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleProceedToConfirm = () => {
    if (!selectedFile) {
      setValidationError('Please select a valid PDF file from your computer.');
      return;
    }
    setIsConfirming(true);
  };

  const handleFinalUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    setUploadError(null);

    try {
      const payslip = await uploadPayslipDocument({
        file: selectedFile,
        requestId: request.requestId,
        employeeUID: request.employeeUID,
        staffId: request.staffId,
        employeeName: request.employeeName,
        employeeEmail: `${request.staffId.toLowerCase()}@icoh.org.ng`,
        month: request.month,
        year: request.year,
        uploadedByUID: user.uid,
        uploadedByName: adminProfile?.fullName || user.displayName || 'Payroll Desk Officer',
        actorEmail: user.email || 'payroll@icoh.org.ng',
      });

      onSuccess(payslip);
    } catch (err) {
      setUploadError(getFriendlyErrorMessage(err));
      setIsConfirming(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isReplacement ? 'Replace / Re-issue Payslip PDF' : 'Upload Certified Employee Payslip'}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Target Request: <span className="font-bold text-emerald-800">{request.requestId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Step 1: File Selection & Options */}
        {!isConfirming ? (
          <div className="mt-5 space-y-5">
            {/* Beneficiary Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Staff Name:</span>
                <span className="font-bold text-slate-900">{request.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Staff ID:</span>
                <span className="font-mono font-bold text-slate-900">{request.staffId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Department:</span>
                <span className="font-medium text-slate-700">{request.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Target Period:</span>
                <span className="font-bold text-emerald-800">
                  {getMonthName(request.month)} {request.year}
                </span>
              </div>
            </div>

            {/* File Drag / Drop Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Payslip PDF from Local Storage <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-emerald-600 bg-slate-50/50 transition-colors">
                <div className="space-y-1 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-400" />
                  <div className="flex text-xs text-slate-600 justify-center">
                    <label
                      htmlFor="payslip-file-upload-input"
                      className="relative cursor-pointer bg-white rounded-md font-semibold text-emerald-800 hover:text-emerald-950 focus-within:outline-hidden"
                    >
                      <span>Choose PDF file</span>
                      <input
                        id="payslip-file-upload-input"
                        name="file-upload"
                        type="file"
                        accept="application/pdf,.pdf"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1 text-slate-500">or drag and drop</p>
                  </div>
                  <p className="text-[11px] text-slate-400">Official PDF format only up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Selected File Badge */}
            {selectedFile && (
              <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    PDF
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Validated
                </span>
              </div>
            )}

            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {validationError}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                id="payslip-modal-continue-button"
                disabled={!selectedFile}
                onClick={handleProceedToConfirm}
                className="px-5 py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 disabled:opacity-50 shadow-sm"
              >
                Verify &amp; Proceed to Confirmation &rarr;
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Critical Confirmation Gate (Required by prompt) */
          <div className="mt-5 space-y-5">
            <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-300 text-amber-950 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm mb-2 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
                Mandatory Upload Verification Gate
              </div>
              <p className="leading-relaxed">
                Please double-check all verification details before committing this document to the employee's permanent record.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Employee Name:</span>
                <span className="font-bold text-slate-900">{request.employeeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Staff ID:</span>
                <span className="font-mono font-bold text-emerald-800">{request.staffId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Payslip Period:</span>
                <span className="font-bold text-slate-900">
                  {getMonthName(request.month)} {request.year}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Requisition Reference:</span>
                <span className="font-mono font-bold text-slate-900">{request.requestId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Selected Filename:</span>
                <span className="font-mono text-emerald-900 font-semibold truncate max-w-[220px]">
                  {selectedFile?.name}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p>
                Confirming this action will immediately mark the request status as <strong>Ready</strong>, record the action in the immutable audit log, and send an email/in-app alert to the employee.
              </p>
            </div>

            <div className="pt-2 flex justify-between gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                &larr; Back to Selection
              </button>

              <button
                type="button"
                id="payslip-modal-final-confirm-button"
                disabled={uploading}
                onClick={handleFinalUpload}
                className="px-6 py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 disabled:opacity-50 shadow-md transition-colors"
              >
                {uploading ? 'Certifying & Uploading PDF...' : 'Confirm & Commit Payslip'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

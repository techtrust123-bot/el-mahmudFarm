/**
 * Export Helper Utility
 * Handles file downloads from export API endpoints
 */

/**
 * Download file from export API endpoint
 * @param {string} endpoint - The export endpoint (e.g., 'livestock', 'poultry', 'feed')
 * @param {object} axiosInstance - Configured axios instance with auth
 * @param {string} filename - Optional custom filename
 * @returns {Promise<void>}
 */
export const downloadExport = async (endpoint, axiosInstance, filename = null) => {
  try {
    const response = await axiosInstance.get(`/api/export/${endpoint}`, {
      responseType: 'blob',
    });

    // Get filename from content-disposition header or use provided one
    const contentDisposition = response.headers['content-disposition'];
    let downloadFilename = filename;
    
    if (!downloadFilename && contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      downloadFilename = filenameMatch ? filenameMatch[1] : `export-${endpoint}-${Date.now()}.csv`;
    }
    
    if (!downloadFilename) {
      downloadFilename = `export-${endpoint}-${Date.now()}.csv`;
    }

    // Create blob URL and trigger download
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', downloadFilename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error(`Export failed for ${endpoint}:`, error);
    throw new Error(
      error.response?.data?.message || 
      `Failed to export ${endpoint}. Please try again.`
    );
  }
};

/**
 * Helper function to get appropriate filename based on endpoint
 * @param {string} endpoint - Export endpoint
 * @returns {string} - Formatted filename
 */
export const getDefaultFilename = (endpoint) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const filenames = {
    livestock: `livestock-export-${timestamp}.csv`,
    poultry: `poultry-export-${timestamp}.csv`,
    sales: `sales-export-${timestamp}.csv`,
    expenses: `expenses-export-${timestamp}.csv`,
    feed: `feed-export-${timestamp}.csv`,
    'farm-report': `farm-report-${timestamp}.csv`,
  };
  return filenames[endpoint] || `export-${endpoint}-${timestamp}.csv`;
};

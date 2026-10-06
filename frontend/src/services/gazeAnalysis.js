export const GAZE_API_URL = import.meta.env.VITE_GAZE_API_URL || 'http://localhost:5001';

export const analyzeGazeFrame = async (base64ImageData) => {
  try {
    const base64Data = base64ImageData.replace(/^data:image\/jpeg;base64,/, '');
    const response = await fetch(`${GAZE_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Data }),
    });

    if (!response.ok) {
      console.error(`Gaze analysis failed with status: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing gaze frame:', error);
    return null;
  }
};

export const checkGazeHealth = async () => {
  try {
    const response = await fetch(`${GAZE_API_URL}/health`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking gaze health:', error);
    return null;
  }
};

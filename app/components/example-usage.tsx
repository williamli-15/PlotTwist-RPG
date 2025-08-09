import ModelViewer from './model-viewer';

const ExampleUsage = () => {
  return (
    <div className="fixed bottom-4 right-4 w-[300px] h-[300px] bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
      <ModelViewer
        src="/weapons/quantum_sword_6.1.glb"
        alt="Quantum Sword"
        cameraControls
        autoRotate
        environmentImage="neutral"
        shadowIntensity={1}
        exposure={1}
        onLoad={() => console.log('Model loaded')}
        onError={(error) => console.error('Error loading model:', error)}
      />
    </div>
  );
};

export default ExampleUsage; 
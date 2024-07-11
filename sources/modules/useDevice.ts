import * as React from 'react';

export function useDevice(): [BluetoothRemoteGATTServer | null, () => Promise<void>] {

    // Create state
    let deviceRef = React.useRef<BluetoothRemoteGATTServer | null>(null);
    let [device, setDevice] = React.useState<BluetoothRemoteGATTServer | null>(null);

    // Function to disconnect and clean up
    const disconnectAndCleanup = React.useCallback(() => {
        if (deviceRef.current && deviceRef.current.connected) {
            console.log('Disconnecting from device');
            deviceRef.current.disconnect();
        }
        deviceRef.current = null;
        setDevice(null);
    }, []);

    // Create callback
    const doConnect = React.useCallback(async () => {
        try {

            // Connect to device
            let connected = await navigator.bluetooth.requestDevice({
                filters: [{ name: 'OpenGlass' }],
                optionalServices: ['19B10000-E8F2-537E-4F6C-D104768A1214'.toLowerCase()],
            });
            // Connect to gatt
            let gatt: BluetoothRemoteGATTServer = await connected.gatt!.connect();
            // Update state
            deviceRef.current = gatt;
            setDevice(gatt);
            console.log('Connected to device', gatt.device.name)
            // Reset on disconnect (avoid loosing everything on disconnect)
            connected.ongattserverdisconnected = (e) => {
                deviceRef.current = null;
                setDevice(null);
                console.log('Disconnected from device')
            }
        } catch (e) {
            // Handle error
            console.error(e);
        }
    }, [device]);
    // Effect to handle page unload
    React.useEffect(() => {
        const handleBeforeUnload = () => {
            disconnectAndCleanup();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup function
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            disconnectAndCleanup();
        };
    }, [disconnectAndCleanup]);
    // Return
    return [device, doConnect];
}
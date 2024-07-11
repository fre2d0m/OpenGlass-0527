import * as React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { rotateImage } from '../modules/imaging';
import { toBase64Image } from '../utils/base64';
import { Agent } from '../agent/Agent';
import { InvalidateSync } from '../utils/invalidateSync';
import { textToSpeech } from '../modules/openai';
import {useState} from "react";

function usePhotos(device: BluetoothRemoteGATTServer) {

    // Subscribe to device
    const [photos, setPhotos] = React.useState<Uint8Array[]>([]);
    const [subscribed, setSubscribed] = React.useState<boolean>(false);
    React.useEffect(() => {
        (async () => {
            console.log('Begin photo subscription')
            const bufferPoll: {[key: string]: {id: number, data: Uint8Array}[]} = {};
            async function onCompleted(fileId: string) {
                const data = bufferPoll[fileId].sort((a, b) => a.id - b.id);
                let buffer = new Uint8Array(0);
                for(const chunk of data) {
                    buffer = new Uint8Array([...buffer, ...chunk.data]);
                }
                const rotated = await rotateImage(buffer, '270');
                setPhotos((savedPhotos) => [...savedPhotos, rotated]);
                delete bufferPoll[fileId];
            }
            async function onChunk(fileId: string, id: number, data: Uint8Array) {
                if (fileId in bufferPoll) {
                    bufferPoll[fileId].push({id, data});
                } else {
                    bufferPoll[fileId] = [{id, data}];
                }
                console.log(id, data.length, fileId)
            }

            // Subscribe for photo updates
            const service = await device.getPrimaryService('19B10000-E8F2-537E-4F6C-D104768A1214'.toLowerCase());
            const photoCharacteristic = await service.getCharacteristic('19b10005-e8f2-537e-4f6c-d104768a1214');
            await photoCharacteristic.startNotifications();
            setSubscribed(true);
            photoCharacteristic.addEventListener('characteristicvaluechanged', async (e) => {
                const characteristic = (e.target as BluetoothRemoteGATTCharacteristic);
                let value = characteristic.value!;
                let array = new Uint8Array(value.buffer);
                // end of transmission
                let byte3 = array[2];
                let byte4 = array[3];
                const fileId = `${byte3.toString(16).padStart(2, '0')}${byte4.toString(16).padStart(2, '0')}`
                if (array[0] == 0xff && array[1] == 0xff) {
                    console.log('New photo transmission complete of file: ', fileId);
                    await onCompleted(fileId);
                } else {
                    let packetId = array[0] + (array[1] << 8);
                    let packet = array.slice(4);
                    await onChunk(fileId, packetId, packet);
                }
            });
        })();
    }, []);

    return [subscribed, photos] as const;
}

export const DeviceView = React.memo((props: { device: BluetoothRemoteGATTServer }) => {
    const [subscribed, photos] = usePhotos(props.device);
    const agent = React.useMemo(() => new Agent(), []);
    const agentState = agent.use();
    // Background processing agent
    const processedPhotos = React.useRef<Uint8Array[]>([]);
    const sync = React.useMemo(() => {
        let processed = 0;
        return new InvalidateSync(async () => {
            if (processedPhotos.current.length > processed) {
                let unprocessed = processedPhotos.current.slice(processed);
                processed = processedPhotos.current.length;
                await agent.addPhoto(unprocessed);
            }
        });
    }, []);
    React.useEffect(() => {
        processedPhotos.current = photos;
        sync.invalidate();
    }, [photos]);

    React.useEffect(() => {
        if (agentState.answer) {
            textToSpeech(agentState.answer)
        }
    }, [agentState.answer])

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {photos.map((photo, index) => (
                        <Image key={index} style={{ width: 100, height: 100 }} source={{ uri: toBase64Image(photo) }} />
                    ))}
                </View>
            </View>

            <View style={{ backgroundColor: 'rgb(28 28 28)', height: 600, width: 600, borderRadius: 64, flexDirection: 'column', padding: 64 }}>
                <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {agentState.loading && (<ActivityIndicator size="large" color={"white"} />)}
                    {agentState.answer && !agentState.loading && (<ScrollView style={{ flexGrow: 1, flexBasis: 0 }}><Text style={{ color: 'white', fontSize: 32 }}>{agentState.answer}</Text></ScrollView>)}
                </View>
                <TextInput
                    style={{ color: 'white', height: 64, fontSize: 32, borderRadius: 16, backgroundColor: 'rgb(48 48 48)', padding: 16 }}
                    placeholder='What do you need?'
                    placeholderTextColor={'#888'}
                    readOnly={agentState.loading}
                    onSubmitEditing={(e) => agent.answer(e.nativeEvent.text)}
                />
            </View>
        </View>
    );
});
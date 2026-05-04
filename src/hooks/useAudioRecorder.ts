import { Audio } from 'expo-av'
import { useState, useCallback, useRef } from 'react'

export const useAudioRecorder = () => {
  const recordingRef = useRef<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)

  const startRecording = useCallback(async () => {
    try {
      // Pedir permisos
      const perm = await Audio.requestPermissionsAsync()
      if (!perm.granted) {
        console.error('No se otorgaron permisos de audio')
        return false
      }

      // Configurar categoría de audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      })

      // Crear y iniciar grabación
      const rec = new Audio.Recording()
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      await rec.startAsync()
      
      recordingRef.current = rec
      setIsRecording(true)
      setDuration(0)
      
      return true
    } catch (err) {
      console.error('Error starting recording:', err)
      return false
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return null

    try {
      const recording = recordingRef.current
      // Use the modern API that exists in expo-av
      if (recording.stopAndUnloadAsync) {
        await recording.stopAndUnloadAsync()
      } else {
        throw new Error('Recording object does not support stop methods')
      }

      const uri = recording.getURI()
      
      // Get duration
      const status = await recording.getStatusAsync()
      const durationMs = status?.durationMillis || 0
      
      setIsRecording(false)
      setDuration(0)
      recordingRef.current = null

      return { uri, durationMs }
    } catch (err) {
      console.error('Error stopping recording:', err)
      recordingRef.current = null
      return null
    }
  }, [])

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        const recording = recordingRef.current
        if (recording.stopAndUnloadAsync) {
          await recording.stopAndUnloadAsync()
        } else {
          console.warn('Recording object does not support stop methods')
        }
      } catch (err) {
        console.error('Error cancelling recording:', err)
      }
    }
    setIsRecording(false)
    setDuration(0)
    recordingRef.current = null
  }, [])

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}

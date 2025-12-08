#!/usr/bin/env python3
"""
Demo script for facial processing subsystem
Processes webcam, image, or video using the FacialProcessor.
This cleaned version processes every frame for video mode and records blink timestamps
from the FocusEstimator into the run summary.
"""

import cv2
import sys
import os
import json
import argparse
from datetime import datetime
from pathlib import Path

# Ensure src is importable
sys.path.insert(0, str(Path(__file__).parent))

from src.core import FacialProcessor, get_config


def demo_webcam(session_id: str = "demo_session"):
    print("🎥 Starting webcam demo...")
    print("Press 'q' to quit")

    config = get_config()
    processor = FacialProcessor(config)
    processor.start_session(session_id)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Failed to open webcam")
        return

    frame_count = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            result = processor.process_frame(frame, session_id)

            display_frame = frame.copy()
            if result.face_detected:
                color = (0, 255, 0)
                text = f"Focus: {result.focus_score:.2f} | {result.emotion}"
            else:
                color = (0, 0, 255)
                text = "No face detected"

            cv2.putText(display_frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            cv2.imshow('Facial Processing Demo', display_frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break

    finally:
        cap.release()


def demo_video_2(video_path: str):
    """Process the video but only analyze one frame every ~2 seconds.
    Keeps the same outputs as demo_video but reduces processing by sampling.
    """
    print(f"🎬 Processing video (sample every 2s): {video_path}")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_folder = f"Video_runs/run_{timestamp}_sample2s"
    os.makedirs(run_folder, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"❌ Could not open {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = (total_frames / fps) if fps > 0 else 0.0
    print(f"📊 {fps:.1f} FPS, {total_frames} frames, {duration:.1f}s")

    processor = FacialProcessor(get_config())
    session_id = f"video2_{timestamp}"
    processor.start_session(session_id)

    frame_results = []
    frame_count = 0

    # Determine sampling interval in frames (~every 2 seconds)
    if fps and fps > 0:
        sample_interval = max(1, int(round(fps * 2.0)))
    else:
        sample_interval = 1
        print("⚠️ Warning: FPS unknown, sampling every frame")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            ts = (frame_count / fps) if fps > 0 else float(frame_count)

            if (frame_count % sample_interval) == 0:
                result = processor.process_frame(frame, session_id)
                frame_results.append({'frame_number': frame_count, 'timestamp': ts, 'result': result})

                # save annotated frame for debugging (optional)
                display_frame = frame.copy()
                label = f"F:{result.focus_score:.2f} E:{result.emotion}"
                cv2.putText(display_frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                cv2.imwrite(f"{run_folder}/frame_{frame_count:05d}.jpg", display_frame)

            frame_count += 1

        # Collect results (only from sampled frames)
        valid_results = [r['result'] for r in frame_results if r['result'].face_detected]
        if not valid_results:
            print("❌ No faces detected in the sampled frames of the video")
            return

        avg_focus_score = sum(r.focus_score for r in valid_results) / len(valid_results)

        blink_times = list(getattr(processor.focus_estimator, 'blink_history', []))
        overall_blink_rate = None
        if len(blink_times) >= 2 and duration > 0:
            overall_blink_rate = (len(blink_times) / duration) * 60.0

        emotions = [r.emotion for r in valid_results]
        emotion_counts = {}
        for e in emotions:
            emotion_counts[e] = emotion_counts.get(e, 0) + 1

        avg_gaze_h = sum(r.gaze_horizontal for r in valid_results) / len(valid_results)
        avg_gaze_v = sum(r.gaze_vertical for r in valid_results) / len(valid_results)

        summary = {
            'video_path': video_path,
            'run_folder': run_folder,
            'processing_time': datetime.now().isoformat(),
            'video_stats': {
                'fps': fps,
                'total_frames': total_frames,
                'duration_seconds': duration,
                'frames_processed': len(frame_results),
                'faces_detected': len(valid_results),
                'sample_interval_frames': sample_interval
            },
            'overall_metrics': {
                'average_focus_score': round(avg_focus_score, 3),
                'overall_blink_rate': round(overall_blink_rate, 1) if overall_blink_rate else None,
                'average_gaze_horizontal': round(avg_gaze_h, 1),
                'average_gaze_vertical': round(avg_gaze_v, 1),
                'emotion_distribution': emotion_counts
            },
            'blink_timestamps': blink_times,
            'frame_details': [
                {
                    'frame': r['frame_number'],
                    'timestamp': r['timestamp'],
                    'focus_score': r['result'].focus_score,
                    'emotion': r['result'].emotion,
                    'face_detected': r['result'].face_detected
                }
                for r in frame_results
            ]
        }

        summary_file = f"{run_folder}/summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)

        # Print concise final results
        print(f"\n🎯 FINAL RESULTS (sample every 2s)")
        print(f"{'='*50}")
        print(f"📁 Run folder: {run_folder}")
        print(f"🎬 Video: {video_path}")
        print(f"⏱️  Duration: {duration:.1f}s, Processed {len(valid_results)}/{len(frame_results)} sampled frames with faces")
        print(f"\n📊 OVERALL METRICS:")
        print(f"   Average Focus Score: {avg_focus_score:.3f}")
        if overall_blink_rate:
            print(f"   Overall Blink Rate: {overall_blink_rate:.1f} blinks/min")
            blink_status = "Normal" if 16 <= overall_blink_rate <= 18 else "Abnormal"
            print(f"   Blink Rate Status: {blink_status}")
        else:
            print(f"   Overall Blink Rate: N/A (insufficient data)")

        print(f"   Average Gaze: H={avg_gaze_h:.1f}° V={avg_gaze_v:.1f}°")
        print(f"\n😊 EMOTION DISTRIBUTION:")
        for emotion, count in emotion_counts.items():
            percentage = (count / len(valid_results)) * 100
            print(f"   {emotion}: {count} frames ({percentage:.1f}%)")

        print(f"\n💾 Saved processed sampled frames and summary to: {run_folder}")

    finally:
        cap.release()
        cv2.destroyAllWindows()


def demo_image(image_path: str, session_id: str = "demo_session"):
    # Guard: check file exists before attempting to load
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        # show a quick hint of available files in the same directory
        try:
            folder = os.path.dirname(image_path) or '.'
            available = os.listdir(folder)
            print(f"Available files in '{folder}': {available[:20]}")
        except Exception:
            pass
        return

    processor = FacialProcessor(get_config())
    try:
        result = processor.process_frame_from_file(image_path, session_id)
    except Exception as e:
        print(f"❌ Error processing image {image_path}: {e}")
        return

    print(f"\n--- Results for {image_path} ---")
    print(f"Face Detected: {result.face_detected}")
    if result.face_detected or result.detection_confidence > 0:
        print(f"Detection Confidence: {result.detection_confidence:.3f}")
    else:
        print(f"Detection Confidence: N/A (no face landmarks detected by MediaPipe)")
    if result.face_detected:
        print(f"Focus Score: {result.focus_score:.2f}")
        print(f"Emotion: {result.emotion} (confidence: {result.emotion_confidence:.2f})")
        print(f"Gaze: H={result.gaze_horizontal:.1f}° V={result.gaze_vertical:.1f}°")
        blink_display = f"{result.blink_rate:.1f}/min" if result.blink_rate > 0 else "N/A (single image)"
        print(f"Blink Rate: {blink_display}")
        print(f"Head Pose: Yaw={result.head_yaw:.1f}° Pitch={result.head_pitch:.1f}°")
    print(f"Quality Score: {result.frame_quality:.2f}")
    print(f"Processing Time: {result.total_latency_ms:.1f}ms")

    if result.quality_warning:
        print(f"⚠️ Warning: {result.quality_warning}")


def demo_video(video_path: str):
    print(f"🎬 Processing video: {video_path}")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_folder = f"Video_runs/run_{timestamp}"
    os.makedirs(run_folder, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"❌ Could not open {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = (total_frames / fps) if fps > 0 else 0.0
    print(f"📊 {fps:.1f} FPS, {total_frames} frames, {duration:.1f}s")

    processor = FacialProcessor(get_config())
    session_id = f"video_{timestamp}"
    processor.start_session(session_id)

    frame_results = []
    frame_count = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            ts = (frame_count / fps) if fps > 0 else float(frame_count)
            result = processor.process_frame(frame, session_id)
            frame_results.append({'frame_number': frame_count, 'timestamp': ts, 'result': result})

            # save annotated frame for debugging (optional)
            display_frame = frame.copy()
            label = f"F:{result.focus_score:.2f} E:{result.emotion}"
            cv2.putText(display_frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.imwrite(f"{run_folder}/frame_{frame_count:05d}.jpg", display_frame)

            frame_count += 1

        # Collect results
        valid_results = [r['result'] for r in frame_results if r['result'].face_detected]
        if not valid_results:
            print("❌ No faces detected in the video")
            return

        avg_focus_score = sum(r.focus_score for r in valid_results) / len(valid_results)

        # Blink timestamps come from the FocusEstimator's blink_history (seconds)
        blink_times = list(getattr(processor.focus_estimator, 'blink_history', []))
        overall_blink_rate = None
        if len(blink_times) >= 2 and duration > 0:
            overall_blink_rate = (len(blink_times) / duration) * 60.0*60/duration

        emotions = [r.emotion for r in valid_results]
        emotion_counts = {}
        for e in emotions:
            emotion_counts[e] = emotion_counts.get(e, 0) + 1

        avg_gaze_h = sum(r.gaze_horizontal for r in valid_results) / len(valid_results)
        avg_gaze_v = sum(r.gaze_vertical for r in valid_results) / len(valid_results)

        summary = {
            'video_path': video_path,
            'run_folder': run_folder,
            'processing_time': datetime.now().isoformat(),
            'video_stats': {
                'fps': fps,
                'total_frames': total_frames,
                'duration_seconds': duration,
                'frames_processed': len(frame_results),
                'faces_detected': len(valid_results)
            },
            'overall_metrics': {
                'average_focus_score': round(avg_focus_score, 3),
                'overall_blink_rate': round(overall_blink_rate, 1) if overall_blink_rate else None,
                'average_gaze_horizontal': round(avg_gaze_h, 1),
                'average_gaze_vertical': round(avg_gaze_v, 1),
                'emotion_distribution': emotion_counts
            },
            'blink_timestamps': blink_times,
            'frame_details': [
                {
                    'frame': r['frame_number'],
                    'timestamp': r['timestamp'],
                    'focus_score': r['result'].focus_score,
                    'emotion': r['result'].emotion,
                    'face_detected': r['result'].face_detected
                }
                for r in frame_results
            ]
        }

        summary_file = f"{run_folder}/summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)

        # Print concise final results
        print(f"\n🎯 FINAL RESULTS")
        print(f"{'='*50}")
        print(f"📁 Run folder: {run_folder}")
        print(f"🎬 Video: {video_path}")
        print(f"⏱️  Duration: {duration:.1f}s, Processed {len(valid_results)}/{len(frame_results)} frames with faces")
        print(f"\n📊 OVERALL METRICS:")
        print(f"   Average Focus Score: {avg_focus_score:.3f}")
        if overall_blink_rate:
            print(f"   Overall Blink Rate: {overall_blink_rate:.1f} blinks/min")
            blink_status = "Normal" if 16 <= overall_blink_rate <= 18 else "Abnormal"
            print(f"   Blink Rate Status: {blink_status}")
        else:
            print(f"   Overall Blink Rate: N/A (insufficient data)")

        print(f"   Average Gaze: H={avg_gaze_h:.1f}° V={avg_gaze_v:.1f}°")
        print(f"\n😊 EMOTION DISTRIBUTION:")
        for emotion, count in emotion_counts.items():
            percentage = (count / len(valid_results)) * 100
            print(f"   {emotion}: {count} frames ({percentage:.1f}%)")

        print(f"\n💾 Saved processed frames and summary to: {run_folder}")

    finally:
        cap.release()


def main():
    parser = argparse.ArgumentParser(description="Facial Processing Demo")
    parser.add_argument("--mode", choices=["webcam", "image", "video","blink_rate"], required=True,
                       help="Demo mode: webcam, image, or video")
    parser.add_argument("--input", type=str,
                       help="Path to image file (for image mode) or video file (for video mode)")
    parser.add_argument("--session-id", type=str, default="demo_session",
                       help="Session ID for tracking")

    args = parser.parse_args()

    print("=" * 60)
    print("🎯 Facial Processing Subsystem Demo")
    print("=" * 60)

    if args.mode == "webcam":
        demo_webcam(args.session_id)
    elif args.mode == "image":
        if not args.input:
            print("❌ --input required for image mode")
            return 1
        demo_image(args.input, args.session_id)
    elif args.mode == "video":
        if not args.input:
            print("❌ --input required for video mode")
            return 1
        demo_video_2(args.input)
    elif args.mode == "blink_rate":
        if not args.input:
            print("❌ --input required for blink_rate mode")
            return 1
        demo_video(args.input)

    return 0


if __name__ == "__main__":
    sys.exit(main())
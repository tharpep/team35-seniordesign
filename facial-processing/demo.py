#!/usr/bin/env python3
"""
Demo script for facial processing subsystem
Tests the pipeline with webcam or image file
"""

import cv2
import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.core import FacialProcessor, get_config


def demo_webcam(session_id: str = "demo_session"):
    """Run demo with webcam"""
    print("🎥 Starting webcam demo...")
    print("Press 'q' to quit, 's' to save screenshot")

    # Initialize processor
    config = get_config()
    processor = FacialProcessor(config)
    processor.start_session(session_id)

    # Open webcam
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

            # Process frame
            result = processor.process_frame(frame, session_id)

            # Display results on frame
            display_frame = frame.copy()

            # Draw face bounding box
            if result.face_detected:
                color = (0, 255, 0)  # Green
                text = f"Focus: {result.focus_score:.2f} | {result.emotion}"
            else:
                color = (0, 0, 255)  # Red
                text = "No face detected"

            cv2.putText(display_frame, text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

            # Display metrics
            metrics_text = [
                f"Latency: {result.total_latency_ms:.1f}ms",
                f"Quality: {result.frame_quality:.2f}",
            ]

            if result.face_detected:
                metrics_text.extend([
                    f"Gaze: H={result.gaze_horizontal:.1f}° V={result.gaze_vertical:.1f}°",
                    f"Blink Rate: {result.blink_rate:.1f}/min",
                    f"Head: Yaw={result.head_yaw:.1f}° Pitch={result.head_pitch:.1f}°"
                ])

            for i, line in enumerate(metrics_text):
                cv2.putText(display_frame, line, (10, 60 + i * 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # Show frame
            cv2.imshow('Facial Processing Demo', display_frame)

            # Print results every 30 frames
            if frame_count % 30 == 0:
                print(f"\n--- Frame {frame_count} ---")
                print(f"Focus Score: {result.focus_score:.2f}")
                print(f"Emotion: {result.emotion} ({result.emotion_confidence:.2f})")
                print(f"Latency: {result.total_latency_ms:.1f}ms")

            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                filename = f"screenshot_{frame_count}.jpg"
                cv2.imwrite(filename, display_frame)
                print(f"💾 Saved {filename}")

    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print(f"\n✅ Processed {frame_count} frames")


def demo_image(image_path: str, session_id: str = "demo_session"):
    """Run demo with single image"""
    print(f"🖼️ Processing image: {image_path}")

    # Initialize processor
    processor = FacialProcessor(get_config())

    # Process image
    result = processor.process_frame_from_file(image_path, session_id)

    # Display results
    print(f"\n--- Results ---")
    print(f"Face Detected: {result.face_detected}")
    if result.face_detected:
        print(f"Focus Score: {result.focus_score:.2f}")
        print(f"Emotion: {result.emotion} (confidence: {result.emotion_confidence:.2f})")
        print(f"Gaze: H={result.gaze_horizontal:.1f}° V={result.gaze_vertical:.1f}°")
        print(f"Blink Rate: {result.blink_rate:.1f}/min")
        print(f"Head Pose: Yaw={result.head_yaw:.1f}° Pitch={result.head_pitch:.1f}°")
    print(f"Quality Score: {result.frame_quality:.2f}")
    print(f"Processing Time: {result.total_latency_ms:.1f}ms")

    if result.quality_warning:
        print(f"⚠️ Warning: {result.quality_warning}")

    # Show image with results
    image = cv2.imread(image_path)
    if image is not None:
        text = f"Focus: {result.focus_score:.2f} | {result.emotion}" if result.face_detected else "No face"
        color = (0, 255, 0) if result.face_detected else (0, 0, 255)
        cv2.putText(image, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
        cv2.imshow('Result', image)
        print("\nPress any key to close...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Facial Processing Demo")
    parser.add_argument("--mode", choices=["webcam", "image"], default="webcam",
                       help="Demo mode: webcam or image")
    parser.add_argument("--image", type=str, help="Path to image file (for image mode)")
    parser.add_argument("--session-id", type=str, default="demo_session",
                       help="Session ID")

    args = parser.parse_args()

    print("=" * 60)
    print("🎯 Facial Processing Subsystem Demo")
    print("=" * 60)

    if args.mode == "webcam":
        demo_webcam(args.session_id)
    elif args.mode == "image":
        if not args.image:
            print("❌ --image required for image mode")
            return 1
        demo_image(args.image, args.session_id)

    return 0


if __name__ == "__main__":
    sys.exit(main())

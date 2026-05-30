#!/usr/bin/env python3
"""
Training script for presence detection model (CNN-5).

Uses UT-HAR public dataset with binary labels (Present/Absent).
Download from: https://github.com/ermongroup/ut-har-data

Expected convergence: <30 epochs (~5 minutes on laptop).
Target accuracy: >95% binary classification.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
from pathlib import Path
import sys

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.presence import PresenceCNN


def load_ut_har_data(data_dir: str = "data/ut-har") -> tuple:
    """
    Load UT-HAR dataset.
    
    Expected structure:
    data/ut-har/
    ├── csi_traces/
    ├── activity_labels.txt
    └── ...
    
    This is a placeholder. In practice, download from:
    https://github.com/ermongroup/ut-har-data
    
    Returns:
        (X_train, y_train, X_test, y_test)
        where X is shape (N, 3, 30, 100) and y is [0, 1]
    """
    print(f"Loading UT-HAR data from {data_dir}...")
    # TODO: Implement actual data loading
    # For now, generate synthetic data with realistic shape
    print("Note: Using synthetic data. Download real UT-HAR for training.")
    
    n_samples = 1000
    X = np.random.randn(n_samples, 1, 30, 100).astype(np.float32)
    y = np.random.randint(0, 2, n_samples)
    
    # Train/test split
    split_idx = int(0.8 * n_samples)
    X_train, y_train = X[:split_idx], y[:split_idx]
    X_test, y_test = X[split_idx:], y[split_idx:]
    
    return X_train, y_train, X_test, y_test


def train_epoch(model, train_loader, criterion, optimizer, device):
    """
    Train one epoch.
    """
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0
    
    for X_batch, y_batch in train_loader:
        X_batch = X_batch.to(device)
        y_batch = y_batch.to(device)
        
        # Forward
        logits = model(X_batch)
        loss = criterion(logits, y_batch)
        
        # Backward
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        # Metrics
        total_loss += loss.item() * X_batch.size(0)
        predictions = torch.argmax(logits, dim=1)
        correct += (predictions == y_batch).sum().item()
        total += X_batch.size(0)
    
    avg_loss = total_loss / total
    accuracy = correct / total
    return avg_loss, accuracy


def evaluate(model, test_loader, criterion, device):
    """
    Evaluate on test set.
    """
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            X_batch = X_batch.to(device)
            y_batch = y_batch.to(device)
            
            logits = model(X_batch)
            loss = criterion(logits, y_batch)
            
            total_loss += loss.item() * X_batch.size(0)
            predictions = torch.argmax(logits, dim=1)
            correct += (predictions == y_batch).sum().item()
            total += X_batch.size(0)
    
    avg_loss = total_loss / total
    accuracy = correct / total
    return avg_loss, accuracy


def main():
    # Hyperparameters
    EPOCHS = 30
    BATCH_SIZE = 32
    LEARNING_RATE = 0.001
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    print(f"Device: {DEVICE}")
    print(f"Epochs: {EPOCHS}, Batch size: {BATCH_SIZE}, LR: {LEARNING_RATE}")
    
    # Load data
    X_train, y_train, X_test, y_test = load_ut_har_data()
    print(f"Training set: {X_train.shape}")
    print(f"Test set: {X_test.shape}")
    
    # Create datasets and loaders
    train_dataset = TensorDataset(
        torch.FloatTensor(X_train),
        torch.LongTensor(y_train)
    )
    test_dataset = TensorDataset(
        torch.FloatTensor(X_test),
        torch.LongTensor(y_test)
    )
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    # Model
    model = PresenceCNN().to(DEVICE)
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.1)
    
    # Training loop
    best_test_acc = 0.0
    print("\nTraining...")
    print(f"{'Epoch':<8} {'Train Loss':<15} {'Train Acc':<15} {'Test Loss':<15} {'Test Acc':<15}")
    print("-" * 70)
    
    for epoch in range(EPOCHS):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, DEVICE)
        test_loss, test_acc = evaluate(model, test_loader, criterion, DEVICE)
        scheduler.step()
        
        print(f"{epoch+1:<8} {train_loss:<15.4f} {train_acc:<15.4f} {test_loss:<15.4f} {test_acc:<15.4f}")
        
        # Save best model
        if test_acc > best_test_acc:
            best_test_acc = test_acc
            model_path = Path(__file__).parent.parent / "models" / "presence.pt"
            model_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), model_path)
            print(f"  -> Saved best model (acc={best_test_acc:.4f}) to {model_path}")
    
    print("\nTraining complete!")
    print(f"Best test accuracy: {best_test_acc:.4f}")


if __name__ == "__main__":
    main()

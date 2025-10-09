import React from 'react';
import type { PopupState } from './types';

interface EquationContentProps {
    popup: PopupState;
    setPopup: React.Dispatch<React.SetStateAction<PopupState>>;
}

const equationArtifacts = [
    {
        id: 'eq1',
        title: 'Henderson-Hasselbalch Equation',
        preview: 'pH = pKa + log([A⁻]/[HA])',
        content: 'pH = pKa + log([A⁻]/[HA])',
        description: 'Used to calculate the pH of buffer solutions'
    },
    {
        id: 'eq2', 
        title: 'Arrhenius Equation',
        preview: 'k = Ae^(-Ea/RT)',
        content: 'k = Ae^(-Ea/RT)',
        description: 'Describes the temperature dependence of reaction rates'
    },
    {
        id: 'eq3',
        title: 'Beer-Lambert Law',
        preview: 'A = εbc',
        content: 'A = εbc',
        description: 'Relates the absorption of light to the properties of the material'
    }
];

export default function EquationContent({ popup }: EquationContentProps) {
    const equation = equationArtifacts[popup.currentIndex];
    if (!equation) return null;

    return (
        <div className="equation-popup">
            <div className="equation-title">
                <h4>{equation.title}</h4>
            </div>
            <div className="equation-content">
                <p>{equation.preview}</p>
            </div>
        </div>
    );
}

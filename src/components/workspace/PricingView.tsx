import React, { useState } from 'react';
import { calculatePricingRecommendation, PricingInputs } from '../../utils/pricingService';

interface PricingViewProps {
  baseCurrency: string;
  defaultHourlyRate: number;
  defaultMarkupPercent: number;
}

export const PricingView: React.FC<PricingViewProps> = ({
  baseCurrency,
  defaultHourlyRate,
  defaultMarkupPercent,
}) => {
  const [inputs, setInputs] = useState<PricingInputs>({
    hoursWorked: 24,
    hourlyWage: defaultHourlyRate || 65,
    materialsCost: 150,
    framingCost: 200,
    studioOverheadCost: 80,
    width: 90,
    height: 120,
    unit: 'cm',
    galleryCommissionPercent: defaultMarkupPercent || 50,
    experienceLevel: 'mid-career',
    currency: baseCurrency,
  });

  const recommendation = calculatePricingRecommendation(inputs);

  return (
    <div className="workspace-view-container" id="ws-panel-pricing">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Pricing Intelligence & Valuation Calculator</h2>
          <p className="view-subheading">
            Mathematical cost-plus and square-inch valuation engine. Calibrated to ensure you never undercharge for labor, materials, or gallery commission splits.
          </p>
        </div>
      </div>

      <div className="pricing-layout-grid">
        {/* Controls / Inputs Form */}
        <div className="pricing-inputs-card">
          <h3 className="card-subtitle">Artwork Production Parameters</h3>

          <div className="form-group-row">
            <div className="form-field">
              <label htmlFor="p-hours">Hours Spent Creating: <strong>{inputs.hoursWorked} hrs</strong></label>
              <input
                id="p-hours"
                type="range"
                min="0"
                max="200"
                step="1"
                value={inputs.hoursWorked}
                onChange={(e) => setInputs({ ...inputs, hoursWorked: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="p-wage">Hourly Wage ({inputs.currency}/hr)</label>
              <input
                id="p-wage"
                type="number"
                min="0"
                value={inputs.hourlyWage}
                onChange={(e) => setInputs({ ...inputs, hourlyWage: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-field">
              <label htmlFor="p-materials">Materials Cost ({inputs.currency})</label>
              <input
                id="p-materials"
                type="number"
                min="0"
                value={inputs.materialsCost}
                onChange={(e) => setInputs({ ...inputs, materialsCost: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="p-framing">Framing & Finishing ({inputs.currency})</label>
              <input
                id="p-framing"
                type="number"
                min="0"
                value={inputs.framingCost}
                onChange={(e) => setInputs({ ...inputs, framingCost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-field">
              <label htmlFor="p-overhead">Studio Overhead Allocation ({inputs.currency})</label>
              <input
                id="p-overhead"
                type="number"
                min="0"
                value={inputs.studioOverheadCost}
                onChange={(e) => setInputs({ ...inputs, studioOverheadCost: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="p-level">Career / Market Stage</label>
              <select
                id="p-level"
                value={inputs.experienceLevel}
                onChange={(e) => setInputs({ ...inputs, experienceLevel: e.target.value as any })}
              >
                <option value="emerging">Emerging Practitioner</option>
                <option value="mid-career">Mid-Career / Represented</option>
                <option value="established">Established / Institutional</option>
              </select>
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-field">
              <label htmlFor="p-width">Width ({inputs.unit})</label>
              <input
                id="p-width"
                type="number"
                min="1"
                value={inputs.width}
                onChange={(e) => setInputs({ ...inputs, width: parseFloat(e.target.value) || 1 })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="p-height">Height ({inputs.unit})</label>
              <input
                id="p-height"
                type="number"
                min="1"
                value={inputs.height}
                onChange={(e) => setInputs({ ...inputs, height: parseFloat(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="p-commission">
              Gallery Commission Split: <strong>{inputs.galleryCommissionPercent}%</strong>
            </label>
            <input
              id="p-commission"
              type="range"
              min="0"
              max="70"
              step="5"
              value={inputs.galleryCommissionPercent}
              onChange={(e) => setInputs({ ...inputs, galleryCommissionPercent: parseFloat(e.target.value) || 0 })}
            />
            <span className="slider-help">
              Standard commercial gallery consignment split is 50%. Setting 0% models direct studio sales.
            </span>
          </div>
        </div>

        {/* Results & Recommendation Cards */}
        <div className="pricing-results-card">
          <div className="results-header">
            <h3>Calculated Price Recommendations</h3>
            <span className="live-pill">Live Math</span>
          </div>

          {/* Gallery Retail Price Highlight */}
          <div className="price-hero-box">
            <div className="hero-label">Recommended Gallery Retail Price</div>
            <div className="hero-value">
              {inputs.currency} {recommendation.galleryRetailPrice.toLocaleString()}
            </div>
            <div className="hero-subtext">
              Guarantees you pocket <strong>{inputs.currency} {recommendation.directStudioPrice.toLocaleString()}</strong> after the {inputs.galleryCommissionPercent}% gallery cut.
            </div>
          </div>

          <div className="pricing-tiers-grid">
            <div className="tier-box">
              <span className="tier-label">Cost Breakeven Floor</span>
              <span className="tier-val">{inputs.currency} {recommendation.costFloorPrice.toLocaleString()}</span>
              <span className="tier-note">Labor ({recommendation.laborTotal}) + Production ({recommendation.productionTotal})</span>
            </div>

            <div className="tier-box">
              <span className="tier-label">Direct Studio Price</span>
              <span className="tier-val text-emerald">{inputs.currency} {recommendation.directStudioPrice.toLocaleString()}</span>
              <span className="tier-note">Direct to collector (+{recommendation.profitMarginPercent}% profit margin)</span>
            </div>

            <div className="tier-box">
              <span className="tier-label">Surface Area Benchmark</span>
              <span className="tier-val">{inputs.currency} {recommendation.surfaceAreaMultiplierPrice.toLocaleString()}</span>
              <span className="tier-note">{recommendation.surfaceArea} {recommendation.surfaceAreaUnit} @ market baseline</span>
            </div>
          </div>

          <div className="formula-breakdown-box">
            <h4>Calculation Transparency</h4>
            <ul>
              {recommendation.breakdownSummary.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>

          {recommendation.missingInputsNotice && (
            <div className="alert-card warning-accent">
              <span className="alert-icon" aria-hidden="true">⚠️</span>
              <p>{recommendation.missingInputsNotice}</p>
            </div>
          )}

          <div className="pricing-disclaimer">
            ⚖️ <strong>Transparency Notice:</strong> {recommendation.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
};

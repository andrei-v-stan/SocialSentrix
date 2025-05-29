import '@/styles/about.css';

export default function About() {
  return (
    <div className="about-container">
      <header className="about-header">
        <h6><strong>A Platform for Visualizing Digital Identity and Reputation Calculation of Social Media Platforms</strong></h6>
        <p><strong>Student:</strong> Stan Andrei - Vlăduț</p>
        <p><strong>Professor:</strong> Dr. Sabin-Corneliu Buraga</p>
        <p><strong>College:</strong> University of &quot;Alexandru Ioan Cuza&quot;</p>
        <p><strong>University:</strong> Faculty of Computer Science</p>
      </header>

      <section className="about-section">
        <h2 className="section-title">Abstract</h2>
        <p>
          <strong>SocialSentrix</strong> is a full-stack platform engineered to analyze and visualize how users present themselves
          and are perceived across social media. The application supports cross-platform profile submission, currently
          integrated with Reddit and Bluesky, and automatically extracts activity such as posts, comments, reactions,
          and metadata using both public endpoints and headless browser automation. The system then computes a suite of
          reputation metrics known as <strong>SETIC</strong>—Sentiment, Engagement, Trustworthiness, Influence, and Consistency—
          enabling deep analysis of digital presence.
        </p>
        <p>
          Through a combination of backend crawlers, MongoDB storage, and a responsive React frontend, the platform offers users
          an interactive dashboard featuring time-based graphs, activity timelines, and data clustering. A unique feature
          of SocialSentrix is its capability to generate <strong>custom comparison graphs</strong> across multiple profiles and even
          different platforms, allowing researchers, analysts, or users to evaluate how an individual or organization
          performs in relative terms.
        </p>
        <p>
          Beyond visualization, the project contributes academically by providing a measurable structure for
          understanding online reputation. The hybrid use of sentiment analysis, engagement tracking, and behavioral
          consistency modeling highlights the correlation between digital activity and perceived identity—bridging the
          gap between online behavior and its broader sociotechnical influence.
        </p>
      </section>

      <section className="about-section">
        <h2 className="section-title">System Diagrams</h2>
        <div className="image-section">
          <figure>
            <a href="src/assets/Diagrams.png" target="_blank" rel="noopener noreferrer">
              <img src="src/assets/Diagrams.png" alt="System Architecture Diagram" className="about-image" />
            </a>
            <figcaption className="image-caption">System Architecture Overview</figcaption>
          </figure>

          <figure>
            <a href="src/assets/FlowSequence.png" target="_blank" rel="noopener noreferrer">
              <img src="src/assets/FlowSequence.png" alt="Data Flow Sequence" className="about-image" />
            </a>
            <figcaption className="image-caption">Data Processing Flow</figcaption>
          </figure>

          <figure>
            <a href="src/assets/MongoDB.png" target="_blank" rel="noopener noreferrer">
              <img src="src/assets/MongoDB.png" alt="MongoDB Schema" className="about-image" />
            </a>
            <figcaption className="image-caption">MongoDB Document Structure</figcaption>
          </figure>
        </div>
      </section>
    </div>
  );
}
